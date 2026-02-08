const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    recordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Record'
    },
    uploadJobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadJob'
    },
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'RECONCILE', 'UPLOAD', 'MANUAL_CORRECTION']
    },
    entityType: {
        type: String,
        required: true,
        enum: ['Record', 'UploadJob', 'ReconciliationResult']
    },
    oldValue: {
        type: mongoose.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    source: {
        type: String,
        enum: ['API', 'SYSTEM', 'MANUAL'],
        default: 'API'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    ipAddress: String,
    userAgent: String
});

// Make the schema immutable - prevent updates and deletes
auditLogSchema.pre('findOneAndUpdate', function (next) {
    next(new Error('Audit logs are immutable'));
});

auditLogSchema.pre('findOneAndDelete', function (next) {
    next(new Error('Audit logs are immutable'));
});

auditLogSchema.pre('updateOne', function (next) {
    next(new Error('Audit logs are immutable'));
});

// Indexes for efficient querying
auditLogSchema.index({ recordId: 1, timestamp: -1 });
auditLogSchema.index({ uploadJobId: 1, timestamp: -1 });
auditLogSchema.index({ changedBy: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
