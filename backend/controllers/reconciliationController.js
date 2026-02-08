const ReconciliationResult = require('../models/ReconciliationResult');
const Record = require('../models/Record');
const AuditLog = require('../models/AuditLog');

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const { startDate, endDate, status, uploadedBy } = req.query;

        const uploadJobQuery = {};

        if (startDate || endDate) {
            uploadJobQuery.createdAt = {};
            if (startDate) uploadJobQuery.createdAt.$gte = new Date(startDate);
            if (endDate) uploadJobQuery.createdAt.$lte = new Date(endDate);
        }

        if (status) {
            uploadJobQuery.matchStatus = status;
        }

        if (uploadedBy) {
            uploadJobQuery.uploadedBy = uploadedBy;
        }

        // Get reconciliation results with filters
        const results = await ReconciliationResult.find(uploadJobQuery);

        const stats = {
            totalRecords: results.length,
            matched: 0,
            partiallyMatched: 0,
            unmatched: 0,
            duplicate: 0,
            reconciliationAccuracy: 0
        };

        results.forEach(result => {
            switch (result.matchStatus) {
                case 'Matched':
                    stats.matched++;
                    break;
                case 'Partially Matched':
                    stats.partiallyMatched++;
                    break;
                case 'Not Matched':
                    stats.unmatched++;
                    break;
                case 'Duplicate':
                    stats.duplicate++;
                    break;
            }
        });

        // Calculate reconciliation accuracy
        if (stats.totalRecords > 0) {
            stats.reconciliationAccuracy = (
                ((stats.matched + stats.partiallyMatched) / stats.totalRecords) * 100
            ).toFixed(2);
        }

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get reconciliation results with filters
 */
exports.getReconciliationResults = async (req, res) => {
    try {
        const { uploadJobId, matchStatus, page = 1, limit = 50 } = req.query;

        const query = {};

        if (uploadJobId) {
            query.uploadJobId = uploadJobId;
        }

        if (matchStatus) {
            query.matchStatus = matchStatus;
        }

        const skip = (page - 1) * limit;

        const results = await ReconciliationResult.find(query)
            .populate('recordId')
            .populate('uploadJobId', 'fileName uploadedBy createdAt')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await ReconciliationResult.countDocuments(query);

        res.json({
            results,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Manual correction of a record
 */
exports.manualCorrection = async (req, res) => {
    try {
        const { recordId } = req.params;
        const updates = req.body;

        // Validate at least one field is being updated
        const allowedUpdates = ['transactionId', 'amount', 'referenceNumber', 'date'];
        const updateKeys = Object.keys(updates).filter(key => allowedUpdates.includes(key));

        if (updateKeys.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update',
                allowedFields: allowedUpdates
            });
        }

        // Validate amount if provided
        if (updates.amount !== undefined && (isNaN(updates.amount) || updates.amount < 0)) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }

        // Validate date if provided
        if (updates.date) {
            const dateObj = new Date(updates.date);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({ error: 'Invalid date format' });
            }
        }

        const record = await Record.findById(recordId);

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Store old value for audit
        const oldValue = {
            transactionId: record.transactionId,
            amount: record.amount,
            referenceNumber: record.referenceNumber,
            date: record.date
        };

        // Apply updates
        if (updates.transactionId) record.transactionId = updates.transactionId;
        if (updates.amount !== undefined) record.amount = updates.amount;
        if (updates.referenceNumber) record.referenceNumber = updates.referenceNumber;
        if (updates.date) record.date = new Date(updates.date);

        record.updatedAt = new Date();
        await record.save();

        // Create audit log
        await AuditLog.create({
            recordId: record._id,
            uploadJobId: record.uploadJobId,
            action: 'MANUAL_CORRECTION',
            entityType: 'Record',
            oldValue,
            newValue: {
                transactionId: record.transactionId,
                amount: record.amount,
                referenceNumber: record.referenceNumber,
                date: record.date
            },
            changedBy: req.user._id,
            source: 'MANUAL',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({
            message: 'Record updated successfully',
            record
        });
    } catch (error) {
        console.error('Manual correction error:', error);
        res.status(500).json({ error: 'Failed to update record' });
    }
};
