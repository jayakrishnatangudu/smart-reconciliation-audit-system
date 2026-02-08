const mongoose = require('mongoose');

const uploadJobSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    fileHash: {
        type: String,
        required: true,
        index: true // For idempotency checks
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Failed', 'PartiallyFailed'],
        default: 'Pending'
    },
    totalRecords: {
        type: Number,
        default: 0
    },
    processedRecords: {
        type: Number,
        default: 0
    },
    failedRecords: {
        type: Number,
        default: 0
    },
    matchedRecords: {
        type: Number,
        default: 0
    },
    partiallyMatchedRecords: {
        type: Number,
        default: 0
    },
    unmatchedRecords: {
        type: Number,
        default: 0
    },
    duplicateRecords: {
        type: Number,
        default: 0
    },
    columnMapping: {
        type: Map,
        of: String
    },
    errorMessage: String,
    failureReason: String,
    retryCount: {
        type: Number,
        default: 0
    },
    progressPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    queueJobId: String, // Bull queue job ID
    rulesVersion: {
        type: String,
        default: '1.0.0'
    },
    canReprocess: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    startedAt: Date,
    completedAt: Date,
    failedAt: Date
});

// Indexes for performance
uploadJobSchema.index({ uploadedBy: 1, createdAt: -1 });
uploadJobSchema.index({ fileHash: 1, uploadedBy: 1 }); // For idempotency
uploadJobSchema.index({ status: 1, createdAt: -1 }); // For status filtering
uploadJobSchema.index({ queueJobId: 1 }); // For queue job tracking
uploadJobSchema.index({ startedAt: -1 });
uploadJobSchema.index({ completedAt: -1 });

module.exports = mongoose.model('UploadJob', uploadJobSchema);
