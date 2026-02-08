const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliationController');
const { auth, authorize } = require('../middleware/auth');
const { validateObjectId, validateDateParams } = require('../middleware/validation');

router.get('/dashboard/stats',
    auth,
    validateDateParams,
    reconciliationController.getDashboardStats
);

router.get('/results',
    auth,
    reconciliationController.getReconciliationResults
);

// Only Admin and Analyst can make manual corrections
router.patch('/records/:recordId',
    auth,
    authorize('Admin', 'Analyst'),
    validateObjectId('recordId'),
    reconciliationController.manualCorrection
);

module.exports = router;
