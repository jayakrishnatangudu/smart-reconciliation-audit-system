const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { auth } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

router.get('/record/:recordId',
    auth,
    validateObjectId('recordId'),
    auditController.getRecordAuditTimeline
);

router.get('/upload/:uploadJobId',
    auth,
    validateObjectId('uploadJobId'),
    auditController.getUploadJobAuditTimeline
);

router.get('/all',
    auth,
    auditController.getAllAuditLogs
);

module.exports = router;
