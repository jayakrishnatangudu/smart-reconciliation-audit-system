const MatchingRule = require('../models/MatchingRule');

/**
 * Initialize default matching rules if they don't exist
 */
async function initializeDefaultRules() {
    try {
        const rulesCount = await MatchingRule.countDocuments();

        if (rulesCount === 0) {
            console.log('Initializing default matching rules...');

            const defaultRules = [
                {
                    ruleName: 'Exact Match - Transaction ID and Amount',
                    description: 'Matches records with identical transaction ID and amount',
                    ruleType: 'EXACT_MATCH',
                    priority: 100,
                    enabled: true,
                    exactMatchFields: ['transactionId', 'amount']
                },
                {
                    ruleName: 'Exact Match - All Fields',
                    description: 'Matches records with all fields identical',
                    ruleType: 'EXACT_MATCH',
                    priority: 90,
                    enabled: true,
                    exactMatchFields: ['transactionId', 'amount', 'referenceNumber', 'date']
                },
                {
                    ruleName: 'Partial Match - 2% Amount Variance',
                    description: 'Matches records with same reference number and amount within ±2%',
                    ruleType: 'PARTIAL_MATCH',
                    priority: 80,
                    enabled: true,
                    partialMatchConfig: {
                        amountVariancePercent: 2,
                        dateVarianceDays: 0,
                        requiredFields: ['referenceNumber']
                    }
                },
                {
                    ruleName: 'Partial Match - 5% Amount Variance',
                    description: 'Matches records with same reference number and amount within ±5%',
                    ruleType: 'PARTIAL_MATCH',
                    priority: 70,
                    enabled: false, // Disabled by default, can be enabled by admin
                    partialMatchConfig: {
                        amountVariancePercent: 5,
                        dateVarianceDays: 1,
                        requiredFields: ['referenceNumber']
                    }
                },
                {
                    ruleName: 'Reference Number Match',
                    description: 'Matches records by reference number only',
                    ruleType: 'REFERENCE_MATCH',
                    priority: 60,
                    enabled: true
                }
            ];

            await MatchingRule.insertMany(defaultRules);
            console.log(`✓ ${defaultRules.length} default matching rules created`);
        } else {
            console.log(`✓ Found ${rulesCount} existing matching rules`);
        }
    } catch (error) {
        console.error('Error initializing default rules:', error);
        throw error;
    }
}

/**
 * Get current rules version (for reprocessing)
 */
async function getRulesVersion() {
    const rules = await MatchingRule.find({}, 'updatedAt').sort({ updatedAt: -1 }).limit(1);
    if (rules.length > 0) {
        return rules[0].updatedAt.toISOString();
    }
    return '1.0.0';
}

module.exports = {
    initializeDefaultRules,
    getRulesVersion
};
