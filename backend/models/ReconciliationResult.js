const mongoose = require('mongoose');

const reconciliationResultSchema = new mongoose.Schema({
    uploadJobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadJob',
        required: true
    },
    recordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Record',
        required: true
    },
    systemRecord: {
        transactionId: String,
        amount: Number,
        referenceNumber: String,
        date: Date
    },
    uploadedRecord: {
        transactionId: String,
        amount: Number,
        referenceNumber: String,
        date: Date
    },
    matchStatus: {
        type: String,
        enum: ['Matched', 'Partially Matched', 'Not Matched', 'Duplicate', 'Failed'],
        required: true
    },
    mismatchedFields: [{
        field: String,
        systemValue: mongoose.Schema.Types.Mixed,
        uploadedValue: mongoose.Schema.Types.Mixed,
        variance: String
    }],
    matchedRule: {
        type: String // Allow any custom rule name from database
    },
    duplicateReason: String,
    errorMessage: String,
    confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    }
});

// Indexes for efficient querying
reconciliationResultSchema.index({ uploadJobId: 1, matchStatus: 1 });
reconciliationResultSchema.index({ recordId: 1 });
reconciliationResultSchema.index({ matchStatus: 1, createdAt: -1 });
reconciliationResultSchema.index({ matchedRule: 1 });

module.exports = mongoose.model('ReconciliationResult', reconciliationResultSchema);
