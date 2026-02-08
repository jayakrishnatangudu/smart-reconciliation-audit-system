const mongoose = require('mongoose');

const matchingRuleSchema = new mongoose.Schema({
    ruleName: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    ruleType: {
        type: String,
        enum: ['EXACT_MATCH', 'PARTIAL_MATCH', 'REFERENCE_MATCH', 'FUZZY_MATCH'],
        required: true
    },
    priority: {
        type: Number,
        required: true,
        default: 0
    },
    enabled: {
        type: Boolean,
        default: true
    },
    exactMatchFields: [{
        type: String,
        enum: ['transactionId', 'amount', 'referenceNumber', 'date']
    }],
    partialMatchConfig: {
        amountVariancePercent: {
            type: Number,
            default: 2
        },
        dateVarianceDays: {
            type: Number,
            default: 0
        },
        requiredFields: [{
            type: String,
            enum: ['transactionId', 'amount', 'referenceNumber', 'date']
        }]
    },
    fuzzyMatchConfig: {
        similarityThreshold: {
            type: Number,
            min: 0,
            max: 100,
            default: 85
        },
        fieldsToCompare: [{
            type: String
        }]
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for quick retrieval
matchingRuleSchema.index({ enabled: 1, priority: -1 });
matchingRuleSchema.index({ ruleType: 1, enabled: 1 });

module.exports = mongoose.model('MatchingRule', matchingRuleSchema);
