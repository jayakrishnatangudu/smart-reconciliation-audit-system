const AuditLog = require('../models/AuditLog');

/**
 * Get audit timeline for a specific record
 */
exports.getRecordAuditTimeline = async (req, res) => {
    try {
        const { recordId } = req.params;

        const auditLogs = await AuditLog.find({ recordId })
            .populate('changedBy', 'username email')
            .sort({ timestamp: -1 });

        res.json(auditLogs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get audit timeline for an upload job
 */
exports.getUploadJobAuditTimeline = async (req, res) => {
    try {
        const { uploadJobId } = req.params;

        const auditLogs = await AuditLog.find({ uploadJobId })
            .populate('changedBy', 'username email')
            .sort({ timestamp: -1 });

        res.json(auditLogs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get all audit logs with filters
 */
exports.getAllAuditLogs = async (req, res) => {
    try {
        const { action, entityType, startDate, endDate, page = 1, limit = 50 } = req.query;

        const query = {};

        if (action) {
            query.action = action;
        }

        if (entityType) {
            query.entityType = entityType;
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const auditLogs = await AuditLog.find(query)
            .populate('changedBy', 'username email')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ timestamp: -1 });

        const total = await AuditLog.countDocuments(query);

        res.json({
            auditLogs,
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
