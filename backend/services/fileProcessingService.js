const crypto = require('crypto');
const fs = require('fs').promises;
const xlsx = require('xlsx');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const mongoose = require('mongoose');
const UploadJob = require('../models/UploadJob');
const Record = require('../models/Record');
const AuditLog = require('../models/AuditLog');
const reconciliationServiceV2 = require('./reconciliationServiceV2');

class FileProcessingServiceV2 {

    /**
     * Calculate file hash for idempotency (SHA-256)
     */
    async calculateFileHash(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    /**
     * Check if file has been processed before (idempotency check)
     */
    async checkExistingUpload(fileHash, userId) {
        const existingJob = await UploadJob.findOne({
            fileHash,
            uploadedBy: userId,
            status: { $in: ['Completed', 'Processing'] }
        }).sort({ createdAt: -1 });

        return existingJob;
    }

    /**
     * Parse CSV file
     */
    async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    }

    /**
     * Parse Excel file
     */
    async parseExcel(filePath) {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(sheet);
    }

    /**
     * Process file asynchronously with MongoDB transactions
     */
    async processFileAsync(uploadJobId, filePath, columnMapping, userId, fileType, progressCallback) {
        const session = await mongoose.startSession();
        session.startTransaction();

        let uploadJob;

        try {
            uploadJob = await UploadJob.findById(uploadJobId).session(session);

            if (!uploadJob) {
                throw new Error('Upload job not found');
            }

            // Update status to Processing
            uploadJob.status = 'Processing';
            uploadJob.startedAt = new Date();
            await uploadJob.save({ session });

            // Parse file based on type
            let rawData;
            if (fileType === 'csv') {
                rawData = await this.parseCSV(filePath);
            } else {
                rawData = await this.parseExcel(filePath);
            }

            uploadJob.totalRecords = rawData.length;
            await uploadJob.save({ session });

            if (progressCallback) progressCallback(10);

            // Process records in batches with error tracking
            const batchSize = 1000;
            const savedRecords = [];
            const failedRows = [];

            for (let i = 0; i < rawData.length; i += batchSize) {
                const batch = rawData.slice(i, i + batchSize);
                const recordsToInsert = [];

                for (let j = 0; j < batch.length; j++) {
                    const row = batch[j];
                    const rowIndex = i + j + 1;

                    try {
                        // Validate required fields
                        const transactionId = row[columnMapping.get('transactionId')];
                        const amountStr = row[columnMapping.get('amount')];
                        const referenceNumber = row[columnMapping.get('referenceNumber')];
                        const dateValue = row[columnMapping.get('date')];

                        if (!transactionId || !amountStr || !referenceNumber || !dateValue) {
                            throw new Error(`Missing required fields in row ${rowIndex}`);
                        }

                        const amount = parseFloat(amountStr);
                        if (isNaN(amount)) {
                            throw new Error(`Invalid amount in row ${rowIndex}: ${amountStr}`);
                        }

                        // Store additional fields
                        const additionalData = {};
                        Object.keys(row).forEach(key => {
                            const mappedField = Array.from(columnMapping.keys()).find(
                                k => columnMapping.get(k) === key
                            );
                            if (!['transactionId', 'amount', 'referenceNumber', 'date'].includes(mappedField)) {
                                additionalData[key] = row[key];
                            }
                        });

                        recordsToInsert.push({
                            uploadJobId,
                            transactionId,
                            amount,
                            referenceNumber,
                            date: new Date(dateValue),
                            additionalData: new Map(Object.entries(additionalData))
                        });

                    } catch (error) {
                        // Track failed row but continue processing
                        failedRows.push({
                            rowIndex,
                            data: row,
                            error: error.message
                        });
                        uploadJob.failedRecords++;
                    }
                }

                // Insert batch
                if (recordsToInsert.length > 0) {
                    const inserted = await Record.insertMany(recordsToInsert, { session });
                    savedRecords.push(...inserted);
                }

                // Update progress
                const processed = Math.min(i + batchSize, rawData.length);
                uploadJob.processedRecords = processed;
                uploadJob.progressPercent = Math.floor((processed / rawData.length) * 60); // 0-60% for processing
                await uploadJob.save({ session });

                if (progressCallback) {
                    progressCallback(Math.floor((processed / rawData.length) * 60));
                }

                // Yield control to event loop
                await new Promise(resolve => setImmediate(resolve));
            }

            if (progressCallback) progressCallback(65);

            // Create audit log for upload
            await AuditLog.create([{
                uploadJobId,
                action: 'UPLOAD',
                entityType: 'UploadJob',
                newValue: {
                    fileName: uploadJob.fileName,
                    totalRecords: uploadJob.totalRecords,
                    failedRecords: uploadJob.failedRecords
                },
                changedBy: userId,
                source: 'SYSTEM'
            }], { session });

            if (progressCallback) progressCallback(70);

            // Perform reconciliation
            const { results, errors } = await reconciliationServiceV2.reconcileRecords(
                uploadJobId,
                savedRecords,
                userId
            );

            if (progressCallback) progressCallback(90);

            // Update job statistics
            const stats = this.calculateStats(results);
            uploadJob.matchedRecords = stats.matched;
            uploadJob.partiallyMatchedRecords = stats.partiallyMatched;
            uploadJob.unmatchedRecords = stats.unmatched;
            uploadJob.duplicateRecords = stats.duplicate;

            // Determine final status
            if (failedRows.length === 0 && errors.length === 0) {
                uploadJob.status = 'Completed';
            } else if (savedRecords.length > 0) {
                uploadJob.status = 'PartiallyFailed';
                uploadJob.errorMessage = `${failedRows.length} rows failed to process, ${errors.length} reconciliation errors`;
            } else {
                uploadJob.status = 'Failed';
                uploadJob.errorMessage = 'All records failed to process';
            }

            uploadJob.completedAt = new Date();
            uploadJob.progressPercent = 100;
            await uploadJob.save({ session });

            // Commit transaction
            await session.commitTransaction();

            if (progressCallback) progressCallback(100);

            // Clean up uploaded file
            try {
                await fs.unlink(filePath);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }

            return {
                success: true,
                savedRecords: savedRecords.length,
                failedRows: failedRows.length,
                reconciliationErrors: errors.length
            };

        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            console.error('File processing error:', error);

            if (uploadJob) {
                uploadJob.status = 'Failed';
                uploadJob.failedAt = new Date();
                uploadJob.failureReason = error.message;
                uploadJob.errorMessage = error.stack;
                await uploadJob.save();
            }

            // Clean up file on error
            try {
                await fs.unlink(filePath);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }

            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Calculate reconciliation statistics
     */
    calculateStats(results) {
        const stats = {
            matched: 0,
            partiallyMatched: 0,
            unmatched: 0,
            duplicate: 0,
            failed: 0
        };

        results.forEach(result => {
            const status = result.matchStatus;
            if (status === 'Matched') stats.matched++;
            else if (status === 'Partially Matched') stats.partiallyMatched++;
            else if (status === 'Not Matched') stats.unmatched++;
            else if (status === 'Duplicate') stats.duplicate++;
            else if (status === 'Failed') stats.failed++;
        });

        return stats;
    }

    /**
     * Get preview of first 20 rows
     */
    async getFilePreview(filePath, fileType) {
        let rawData;

        if (fileType === 'csv') {
            rawData = await this.parseCSV(filePath);
        } else {
            rawData = await this.parseExcel(filePath);
        }

        return {
            preview: rawData.slice(0, 20),
            totalRows: rawData.length,
            columns: Object.keys(rawData[0] || {})
        };
    }
}

module.exports = new FileProcessingServiceV2();
