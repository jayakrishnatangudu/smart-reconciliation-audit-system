const MatchingRule = require('../models/MatchingRule');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const reconciliationServiceV2 = require('../services/reconciliationServiceV2');

/**
 * @desc    Get all matching rules
 * @route   GET /api/rules
 * @access  Private (Admin, Analyst, Viewer)
 */
exports.getAllRules = asyncHandler(async (req, res) => {
    const { enabled, ruleType } = req.query;

    const filter = {};
    if (enabled !== undefined) {
        filter.enabled = enabled === 'true';
    }
    if (ruleType) {
        filter.ruleType = ruleType;
    }

    const rules = await MatchingRule.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .populate('createdBy updatedBy', 'name email');

    res.json({
        success: true,
        count: rules.length,
        data: rules
    });
});

/**
 * @desc    Get single matching rule
 * @route   GET /api/rules/:id
 * @access  Private (Admin, Analyst, Viewer)
 */
exports.getRule = asyncHandler(async (req, res) => {
    const rule = await MatchingRule.findById(req.params.id)
        .populate('createdBy updatedBy', 'name email');

    if (!rule) {
        throw new NotFoundError('Matching rule not found');
    }

    res.json({
        success: true,
        data: rule
    });
});

/**
 * @desc    Create new matching rule
 * @route   POST /api/rules
 * @access  Private (Admin only)
 */
exports.createRule = asyncHandler(async (req, res) => {
    const {
        ruleName,
        description,
        ruleType,
        priority,
        enabled,
        exactMatchFields,
        partialMatchConfig,
        fuzzyMatchConfig
    } = req.body;

    // Validation
    if (!ruleName || !ruleType) {
        throw new ValidationError('ruleName and ruleType are required');
    }

    const rule = await MatchingRule.create({
        ruleName,
        description,
        ruleType,
        priority: priority || 0,
        enabled: enabled !== undefined ? enabled : true,
        exactMatchFields,
        partialMatchConfig,
        fuzzyMatchConfig,
        createdBy: req.user._id,
        updatedBy: req.user._id
    });

    // Invalidate rules cache
    reconciliationServiceV2.invalidateCache();

    res.status(201).json({
        success: true,
        message: 'Matching rule created successfully',
        data: rule
    });
});

/**
 * @desc    Update matching rule
 * @route   PUT /api/rules/:id
 * @access  Private (Admin only)
 */
exports.updateRule = asyncHandler(async (req, res) => {
    let rule = await MatchingRule.findById(req.params.id);

    if (!rule) {
        throw new NotFoundError('Matching rule not found');
    }

    const updateData = { ...req.body, updatedBy: req.user._id };

    rule = await MatchingRule.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    // Invalidate rules cache
    reconciliationServiceV2.invalidateCache();

    res.json({
        success: true,
        message: 'Matching rule updated successfully',
        data: rule
    });
});

/**
 * @desc    Delete matching rule
 * @route   DELETE /api/rules/:id
 * @access  Private (Admin only)
 */
exports.deleteRule = asyncHandler(async (req, res) => {
    const rule = await MatchingRule.findById(req.params.id);

    if (!rule) {
        throw new NotFoundError('Matching rule not found');
    }

    await rule.deleteOne();

    // Invalidate rules cache
    reconciliationServiceV2.invalidateCache();

    res.json({
        success: true,
        message: 'Matching rule deleted successfully'
    });
});

/**
 * @desc    Toggle rule enabled status
 * @route   PATCH /api/rules/:id/toggle
 * @access  Private (Admin only)
 */
exports.toggleRule = asyncHandler(async (req, res) => {
    const rule = await MatchingRule.findById(req.params.id);

    if (!rule) {
        throw new NotFoundError('Matching rule not found');
    }

    rule.enabled = !rule.enabled;
    rule.updatedBy = req.user._id;
    await rule.save();

    // Invalidate rules cache
    reconciliationServiceV2.invalidateCache();

    res.json({
        success: true,
        message: `Rule ${rule.enabled ? 'enabled' : 'disabled'} successfully`,
        data: rule
    });
});

/**
 * @desc    Reorder rules (update priorities)
 * @route   PUT /api/rules/reorder
 * @access  Private (Admin only)
 */
exports.reorderRules = asyncHandler(async (req, res) => {
    const { ruleOrders } = req.body; // Array of {id, priority}

    if (!Array.isArray(ruleOrders)) {
        throw new ValidationError('ruleOrders must be an array');
    }

    const updatePromises = ruleOrders.map(({ id, priority }) =>
        MatchingRule.findByIdAndUpdate(id, {
            priority,
            updatedBy: req.user._id
        })
    );

    await Promise.all(updatePromises);

    // Invalidate rules cache
    reconciliationServiceV2.invalidateCache();

    res.json({
        success: true,
        message: 'Rules reordered successfully'
    });
});
