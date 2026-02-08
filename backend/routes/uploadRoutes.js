const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { auth, authorize, rateLimit } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// File upload routes - Admin and Analyst only
router.post('/preview',
    authorize('Admin', 'Analyst'),
    rateLimit(20, 60000), // 20 uploads per minute
    uploadController.uploadMiddleware,
    uploadController.getPreview
);

router.post('/submit',
    authorize('Admin', 'Analyst'),
    uploadController.submitFile
);

// Status and list routes - All authenticated users
router.get('/status/:jobId',
    uploadController.getUploadStatus
);

router.get('/all',
    uploadController.getAllUploads
);

// Statistics - Admin only
router.get('/stats',
    authorize('Admin'),
    uploadController.getUploadStats
);

// Retry failed upload - Admin only
router.post('/retry/:jobId',
    authorize('Admin'),
    uploadController.retryUpload
);

module.exports = router;
