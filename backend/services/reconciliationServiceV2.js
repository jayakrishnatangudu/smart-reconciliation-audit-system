const Record = require('../models/Record');
const ReconciliationResult = require('../models/ReconciliationResult');
const AuditLog = require('../models/AuditLog');
const MatchingRule = require('../models/MatchingRule');

class ReconciliationServiceV2 {
    constructor() {
        this.rulesCache = null;
        this.rulesCacheTime = null;
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get active reconciliation rules from database
     */
    async getActiveRules() {
        const now = Date.now();

        // Use cache if available and fresh
        if (this.rulesCache && this.rulesCacheTime && (now - this.rulesCacheTime < this.CACHE_TTL)) {
            return this.rulesCache;
        }

        // Fetch from database
        const rules = await MatchingRule.find({ enabled: true }).sort({ priority: -1 });

        this.rulesCache = rules;
        this.rulesCacheTime = now;

        return rules;
    }

    /**
     * Invalidate rules cache (call when rules are updated)
     */
    invalidateCache() {
        this.rulesCache = null;
        this.rulesCacheTime = null;
    }

    /**
     * Reconcile uploaded records against system records with configurable rules
     */
    async reconcileRecords(uploadJobId, uploadedRecords, userId) {
        const results = [];
        const errors = [];
        const seenTransactionIds = new Map();
        const rules = await this.getActiveRules();

        for (let i = 0; i < uploadedRecords.length; i++) {
            const uploadedRecord = uploadedRecords[i];

            try {
                // Check for duplicates within the upload
                if (seenTransactionIds.has(uploadedRecord.transactionId)) {
                    const result = await this.createDuplicateResult(
                        uploadJobId,
                        uploadedRecord,
                        null,
                        userId,
                        'Duplicate within upload'
                    );
                    results.push(result);
                    continue;
                }
                seenTransactionIds.set(uploadedRecord.transactionId, true);

                // Check for duplicates in database across all uploads
                const existingRecords = await Record.find({
                    transactionId: uploadedRecord.transactionId,
                    uploadJobId: { $ne: uploadJobId } // Exclude current upload
                });

                if (existingRecords.length > 0) {
                    const result = await this.createDuplicateResult(
                        uploadJobId,
                        uploadedRecord,
                        existingRecords[0],
                        userId,
                        'Duplicate in system'
                    );
                    results.push(result);
                    continue;
                }

                // Find matching system record from same upload
                const systemRecords = await Record.find({
                    transactionId: uploadedRecord.transactionId,
                    uploadJobId
                });

                if (systemRecords.length > 1) {
                    const result = await this.createDuplicateResult(
                        uploadJobId,
                        uploadedRecord,
                        systemRecords[0],
                        userId,
                        'Multiple matches found'
                    );
                    results.push(result);
                    continue;
                }

                // Apply matching rules in priority order
                let matchFound = false;

                for (const rule of rules) {
                    const matchResult = await this.applyRule(
                        rule,
                        uploadedRecord,
                        uploadJobId
                    );

                    if (matchResult.found) {
                        const result = await this.createMatchResult(
                            uploadJobId,
                            uploadedRecord,
                            matchResult.systemRecord,
                            matchResult.status,
                            rule.ruleName,
                            matchResult.mismatchedFields,
                            userId
                        );
                        results.push(result);
                        matchFound = true;
                        break;
                    }
                }

                // No match found
                if (!matchFound) {
                    const result = await this.createMatchResult(
                        uploadJobId,
                        uploadedRecord,
                        null,
                        'Not Matched',
                        'No matching rule',
                        [],
                        userId
                    );
                    results.push(result);
                }

            } catch (error) {
                console.error(`Error reconciling record ${uploadedRecord.transactionId}:`, error);

                // Log error but continue processing (partial failure handling)
                errors.push({
                    recordId: uploadedRecord._id,
                    transactionId: uploadedRecord.transactionId,
                    error: error.message
                });

                // Create failed reconciliation result
                try {
                    const result = await ReconciliationResult.create({
                        uploadJobId,
                        recordId: uploadedRecord._id,
                        uploadedRecord: {
                            transactionId: uploadedRecord.transactionId,
                            amount: uploadedRecord.amount,
                            referenceNumber: uploadedRecord.referenceNumber,
                            date: uploadedRecord.date
                        },
                        matchStatus: 'Failed',
                        matchedRule: 'Error during processing',
                        errorMessage: error.message
                    });
                    results.push(result);
                } catch (innerError) {
                    console.error('Failed to create error result:', innerError);
                }
            }
        }

        return { results, errors };
    }

    /**
     * Apply a specific matching rule
     */
    async applyRule(rule, uploadedRecord, uploadJobId) {
        try {
            switch (rule.ruleType) {
                case 'EXACT_MATCH':
                    return await this.applyExactMatchRule(rule, uploadedRecord, uploadJobId);

                case 'PARTIAL_MATCH':
                    return await this.applyPartialMatchRule(rule, uploadedRecord, uploadJobId);

                case 'REFERENCE_MATCH':
                    return await this.applyReferenceMatchRule(rule, uploadedRecord, uploadJobId);

                default:
                    return { found: false };
            }
        } catch (error) {
            console.error(`Error applying rule ${rule.ruleName}:`, error);
            return { found: false };
        }
    }

    /**
     * Apply exact match rule
     */
    async applyExactMatchRule(rule, uploadedRecord, uploadJobId) {
        const query = { uploadJobId };

        // Build query based on rule configuration
        if (rule.exactMatchFields && rule.exactMatchFields.length > 0) {
            rule.exactMatchFields.forEach(field => {
                if (uploadedRecord[field] !== undefined) {
                    query[field] = uploadedRecord[field];
                }
            });
        } else {
            // Default: match on transactionId and amount
            query.transactionId = uploadedRecord.transactionId;
            query.amount = uploadedRecord.amount;
        }

        const systemRecord = await Record.findOne(query);

        if (systemRecord && systemRecord._id.toString() !== uploadedRecord._id.toString()) {
            return {
                found: true,
                systemRecord,
                status: 'Matched',
                mismatchedFields: []
            };
        }

        return { found: false };
    }

    /**
     * Apply partial match rule
     */
    async applyPartialMatchRule(rule, uploadedRecord, uploadJobId) {
        const config = rule.partialMatchConfig || {
            amountVariancePercent: 2,
            dateVarianceDays: 0,
            requiredFields: ['referenceNumber']
        };

        // Build query for required fields
        const query = { uploadJobId };
        config.requiredFields.forEach(field => {
            if (uploadedRecord[field]) {
                query[field] = uploadedRecord[field];
            }
        });

        const systemRecords = await Record.find(query);

        for (const systemRecord of systemRecords) {
            if (systemRecord._id.toString() === uploadedRecord._id.toString()) {
                continue;
            }

            const mismatchedFields = [];
            let isPartialMatch = true;

            // Check amount variance
            if (uploadedRecord.amount && systemRecord.amount) {
                const amountVariance = Math.abs(systemRecord.amount - uploadedRecord.amount);
                const variancePercent = (amountVariance / systemRecord.amount) * 100;

                if (variancePercent <= config.amountVariancePercent) {
                    if (amountVariance > 0) {
                        mismatchedFields.push({
                            field: 'amount',
                            systemValue: systemRecord.amount,
                            uploadedValue: uploadedRecord.amount,
                            variance: variancePercent.toFixed(2) + '%'
                        });
                    }
                } else {
                    isPartialMatch = false;
                }
            }

            // Check date variance if configured
            if (config.dateVarianceDays > 0 && uploadedRecord.date && systemRecord.date) {
                const dateDiff = Math.abs(
                    new Date(uploadedRecord.date) - new Date(systemRecord.date)
                ) / (1000 * 60 * 60 * 24);

                if (dateDiff > config.dateVarianceDays) {
                    isPartialMatch = false;
                }
            }

            if (isPartialMatch) {
                // Check transaction ID mismatch
                if (systemRecord.transactionId !== uploadedRecord.transactionId) {
                    mismatchedFields.push({
                        field: 'transactionId',
                        systemValue: systemRecord.transactionId,
                        uploadedValue: uploadedRecord.transactionId
                    });
                }

                return {
                    found: true,
                    systemRecord,
                    status: 'Partially Matched',
                    mismatchedFields
                };
            }
        }

        return { found: false };
    }

    /**
     * Apply reference number match rule
     */
    async applyReferenceMatchRule(rule, uploadedRecord, uploadJobId) {
        if (!uploadedRecord.referenceNumber) {
            return { found: false };
        }

        const systemRecord = await Record.findOne({
            uploadJobId,
            referenceNumber: uploadedRecord.referenceNumber,
            _id: { $ne: uploadedRecord._id }
        });

        if (systemRecord) {
            const mismatchedFields = [];

            if (systemRecord.transactionId !== uploadedRecord.transactionId) {
                mismatchedFields.push({
                    field: 'transactionId',
                    systemValue: systemRecord.transactionId,
                    uploadedValue: uploadedRecord.transactionId
                });
            }

            if (systemRecord.amount !== uploadedRecord.amount) {
                mismatchedFields.push({
                    field: 'amount',
                    systemValue: systemRecord.amount,
                    uploadedValue: uploadedRecord.amount
                });
            }

            return {
                found: true,
                systemRecord,
                status: mismatchedFields.length > 0 ? 'Partially Matched' : 'Matched',
                mismatchedFields
            };
        }

        return { found: false };
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
    async createDuplicateResult(uploadJobId, uploadedRecord, systemRecord, userId, reason) {
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
            matchedRule: 'Duplicate Detection',
            duplicateReason: reason
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

module.exports = new ReconciliationServiceV2();
