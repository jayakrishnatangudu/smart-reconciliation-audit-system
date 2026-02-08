const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    uploadJobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadJob',
        required: true
    },
    transactionId: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    referenceNumber: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    // Additional fields from uploaded data
    additionalData: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Mandatory indexes for performance and duplicate detection
recordSchema.index({ transactionId: 1 });
recordSchema.index({ referenceNumber: 1 });
recordSchema.index({ uploadJobId: 1, createdAt: -1 });
recordSchema.index({ transactionId: 1, uploadJobId: 1 }); // For duplicate detection
recordSchema.index({ referenceNumber: 1, amount: 1 }); // For partial matching
recordSchema.index({ date: -1 }); // For date-based queries
recordSchema.index({ amount: 1 }); // For amount-based searches

module.exports = mongoose.model('Record', recordSchema);
