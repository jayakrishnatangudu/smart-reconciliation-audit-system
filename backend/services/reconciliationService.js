const Record = require('../models/Record');
const ReconciliationResult = require('../models/ReconciliationResult');
const AuditLog = require('../models/AuditLog');

// Configurable reconciliation rules
const RECONCILIATION_RULES = {
    partialMatchVariancePercent: 2, // ±2% for partial match
};

class ReconciliationService {

    /**
     * Reconcile uploaded records against system records
     */
    async reconcileRecords(uploadJobId, uploadedRecords, userId) {
        const results = [];
        const seenTransactionIds = new Map();

        for (const uploadedRecord of uploadedRecords) {
            // Check for duplicates within the upload
            if (seenTransactionIds.has(uploadedRecord.transactionId)) {
                const result = await this.createDuplicateResult(
                    uploadJobId,
                    uploadedRecord,
                    null,
                    userId
                );
                results.push(result);
                continue;
            }
            seenTransactionIds.set(uploadedRecord.transactionId, true);

            // Find matching system record
            const systemRecords = await Record.find({
                transactionId: uploadedRecord.transactionId
            }).limit(2); // Limit to 2 to check for duplicates

            if (systemRecords.length > 1) {
                // Duplicate in system
                const result = await this.createDuplicateResult(
                    uploadJobId,
                    uploadedRecord,
                    systemRecords[0],
                    userId
                );
                results.push(result);
            } else if (systemRecords.length === 1) {
                const systemRecord = systemRecords[0];

                // Check for exact match
                if (this.isExactMatch(systemRecord, uploadedRecord)) {
                    const result = await this.createMatchResult(
                        uploadJobId,
                        uploadedRecord,
                        systemRecord,
                        'Matched',
                        'Exact Match',
                        [],
                        userId
                    );
                    results.push(result);
                } else {
                    // Try partial match
                    const partialMatchResult = this.checkPartialMatch(systemRecord, uploadedRecord);

                    if (partialMatchResult.isMatch) {
                        const result = await this.createMatchResult(
                            uploadJobId,
                            uploadedRecord,
                            systemRecord,
                            'Partially Matched',
                            'Partial Match',
                            partialMatchResult.mismatchedFields,
                            userId
                        );
                        results.push(result);
                    } else {
                        // No match
                        const result = await this.createMatchResult(
                            uploadJobId,
                            uploadedRecord,
                            systemRecord,
                            'Not Matched',
                            'No Match',
                            partialMatchResult.mismatchedFields,
                            userId
                        );
                        results.push(result);
                    }
                }
            } else {
                // Try to find by reference number for partial match
                const refMatch = await Record.findOne({
                    referenceNumber: uploadedRecord.referenceNumber
                });

                if (refMatch) {
                    const partialMatchResult = this.checkPartialMatch(refMatch, uploadedRecord);

                    if (partialMatchResult.isMatch) {
                        const result = await this.createMatchResult(
                            uploadJobId,
                            uploadedRecord,
                            refMatch,
                            'Partially Matched',
                            'Partial Match',
                            partialMatchResult.mismatchedFields,
                            userId
                        );
                        results.push(result);
                    } else {
                        const result = await this.createMatchResult(
                            uploadJobId,
                            uploadedRecord,
                            null,
                            'Not Matched',
                            'No Match',
                            [],
                            userId
                        );
                        results.push(result);
                    }
                } else {
                    // Completely unmatched
                    const result = await this.createMatchResult(
                        uploadJobId,
                        uploadedRecord,
                        null,
                        'Not Matched',
                        'No Match',
                        [],
                        userId
                    );
                    results.push(result);
                }
            }
        }

        return results;
    }

    /**
     * Check if two records match exactly
     */
    isExactMatch(systemRecord, uploadedRecord) {
        return systemRecord.transactionId === uploadedRecord.transactionId &&
            systemRecord.amount === uploadedRecord.amount;
    }

    /**
     * Check for partial match based on reference number and amount variance
     */
    checkPartialMatch(systemRecord, uploadedRecord) {
        const mismatchedFields = [];

        // Reference number must match for partial match
        if (systemRecord.referenceNumber !== uploadedRecord.referenceNumber) {
            return { isMatch: false, mismatchedFields };
        }

        // Check amount variance (±2%)
        const amountVariance = Math.abs(systemRecord.amount - uploadedRecord.amount);
        const variancePercent = (amountVariance / systemRecord.amount) * 100;

        if (variancePercent <= RECONCILIATION_RULES.partialMatchVariancePercent) {
            // It's a partial match
            if (systemRecord.transactionId !== uploadedRecord.transactionId) {
                mismatchedFields.push({
                    field: 'transactionId',
                    systemValue: systemRecord.transactionId,
                    uploadedValue: uploadedRecord.transactionId
                });
            }

            if (amountVariance > 0) {
                mismatchedFields.push({
                    field: 'amount',
                    systemValue: systemRecord.amount,
                    uploadedValue: uploadedRecord.amount,
                    variance: variancePercent.toFixed(2)
                });
            }

            return { isMatch: true, mismatchedFields };
        }

        return { isMatch: false, mismatchedFields: [] };
    }

    /**
     * Create reconciliation result record
     */
    async createMatchResult(uploadJobId, uploadedRecord, systemRecord, matchStatus, matchedRule, mismatchedFields, userId) {
        const result = new ReconciliationResult({
            uploadJobId,
            recordId: uploadedRecord._id,
            systemRecord: systemRecord ? {
                transactionId: systemRecord.transactionId,
                amount: systemRecord.amount,
                referenceNumber: systemRecord.referenceNumber,
                date: systemRecord.date
            } : null,
            uploadedRecord: {
                transactionId: uploadedRecord.transactionId,
                amount: uploadedRecord.amount,
                referenceNumber: uploadedRecord.referenceNumber,
                date: uploadedRecord.date
            },
            matchStatus,
            mismatchedFields,
            matchedRule
        });

        await result.save();

        // Create audit log
        await AuditLog.create({
            recordId: uploadedRecord._id,
            uploadJobId,
            action: 'RECONCILE',
            entityType: 'ReconciliationResult',
            newValue: result,
            changedBy: userId,
            source: 'SYSTEM'
        });

        return result;
    }

    /**
     * Create duplicate result
     */
    async createDuplicateResult(uploadJobId, uploadedRecord, systemRecord, userId) {
        const result = new ReconciliationResult({
            uploadJobId,
            recordId: uploadedRecord._id,
            systemRecord: systemRecord ? {
                transactionId: systemRecord.transactionId,
                amount: systemRecord.amount,
                referenceNumber: systemRecord.referenceNumber,
                date: systemRecord.date
            } : null,
            uploadedRecord: {
                transactionId: uploadedRecord.transactionId,
                amount: uploadedRecord.amount,
                referenceNumber: uploadedRecord.referenceNumber,
                date: uploadedRecord.date
            },
            matchStatus: 'Duplicate',
            matchedRule: 'Duplicate'
        });

        await result.save();

        // Create audit log
        await AuditLog.create({
            recordId: uploadedRecord._id,
            uploadJobId,
            action: 'RECONCILE',
            entityType: 'ReconciliationResult',
            newValue: result,
            changedBy: userId,
            source: 'SYSTEM'
        });

        return result;
    }
}

module.exports = new ReconciliationService();
