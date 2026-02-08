const multer = require('multer');
const path = require('path');
const UploadJob = require('../models/UploadJob');
const fileProcessingService = require('../services/fileProcessingService');
const { fileProcessingQueue } = require('../config/queue');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV and Excel files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
    }
});

exports.uploadMiddleware = upload.single('file');

/**
 * @desc    Get file preview (first 20 rows)
 * @route   POST /api/upload/preview
 * @access  Private (Admin, Analyst)
 */
exports.getPreview = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ValidationError('No file uploaded');
    }

    const fileType = path.extname(req.file.originalname).toLowerCase() === '.csv' ? 'csv' : 'excel';
    const previewData = await fileProcessingService.getFilePreview(req.file.path, fileType);

    res.json({
        success: true,
        fileName: req.file.originalname,
        tempFilePath: req.file.filename, // Send only filename, not full path
        preview: previewData.preview,
        totalRows: previewData.totalRows,
        columns: previewData.columns
    });
});

/**
 * @desc    Submit file for processing with column mapping
 * @route   POST /api/upload/submit
 * @access  Private (Admin, Analyst)
 */
exports.submitFile = asyncHandler(async (req, res) => {
    const { tempFilePath, columnMapping } = req.body;

    // Validate input
    if (!tempFilePath) {
        throw new ValidationError('tempFilePath is required');
    }

    if (!columnMapping || typeof columnMapping !== 'object') {
        throw new ValidationError('Invalid columnMapping. Must be an object.');
    }

    // Validate required column mappings
    const requiredFields = ['transactionId', 'amount', 'referenceNumber', 'date'];
    const missingFields = requiredFields.filter(field => !columnMapping[field]);

    if (missingFields.length > 0) {
        throw new ValidationError(`Missing required column mappings: ${missingFields.join(', ')}`);
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFileName = path.basename(tempFilePath);
    const filePath = path.join(__dirname, '../uploads', sanitizedFileName);

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('File not found. Please upload the file first.');
    }

    // Calculate file hash for idempotency
    const fileHash = await fileProcessingService.calculateFileHash(filePath);

    // Check if file was already processed
    const existingJob = await fileProcessingService.checkExistingUpload(
        fileHash,
        req.user._id
    );

    if (existingJob) {
        return res.json({
            success: true,
            message: 'File already processed',
            uploadJobId: existingJob._id,
            status: existingJob.status,
            existing: true
        });
    }

    // Create upload job with Pending status
    const uploadJob = new UploadJob({
        fileName: path.basename(tempFilePath),
        fileHash,
        uploadedBy: req.user._id,
        status: 'Pending',
        columnMapping: new Map(Object.entries(columnMapping))
    });

    await uploadJob.save();

    // Get file type
    const fileType = path.extname(sanitizedFileName).toLowerCase() === '.csv' ? 'csv' : 'excel';

    // Add job to Bull queue
    const queueJob = await fileProcessingQueue.add({
        uploadJobId: uploadJob._id.toString(),
        filePath,
        columnMapping,
        userId: req.user._id.toString(),
        fileType
    }, {
        jobId: `upload-${uploadJob._id}`,
        removeOnComplete: 100,
        removeOnFail: 500
    });

    // Update upload job with queue job ID
    uploadJob.queueJobId = queueJob.id.toString();
    await uploadJob.save();

    res.status(202).json({
        success: true,
        message: 'File upload accepted and queued for processing',
        uploadJobId: uploadJob._id,
        queueJobId: queueJob.id,
        status: 'Pending'
    });
});

/**
 * @desc    Get upload job status
 * @route   GET /api/upload/status/:jobId
 * @access  Private
 */
exports.getUploadStatus = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const uploadJob = await UploadJob.findById(jobId)
        .populate('uploadedBy', 'name email role');

    if (!uploadJob) {
        throw new NotFoundError('Upload job not found');
    }

    // Check permission - non-admins can only see their own jobs
    if (req.user.role !== 'Admin' && uploadJob.uploadedBy._id.toString() !== req.user._id.toString()) {
        throw new AuthorizationError('Access denied. You can only view your own uploads.');
    }

    // Get queue job status if available
    let queueStatus = null;
    if (uploadJob.queueJobId) {
        try {
            const queueJob = await fileProcessingQueue.getJob(uploadJob.queueJobId);
            if (queueJob) {
                const state = await queueJob.getState();
                queueStatus = {
                    state,
                    progress: queueJob.progress(),
                    attemptsMade: queueJob.attemptsMade,
                    failedReason: queueJob.failedReason
                };
            }
        } catch (err) {
            console.error('Error fetching queue job:', err);
        }
    }

    res.json({
        success: true,
        data: uploadJob,
        queueStatus
    });
});

/**
 * @desc    Get all upload jobs with filtering
 * @route   GET /api/upload/all
 * @access  Private
 */
exports.getAllUploads = asyncHandler(async (req, res) => {
    const { startDate, endDate, status, page = 1, limit = 50 } = req.query;

    const query = {};

    // Date range filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
        query.status = status;
    }

    // Non-admins can only see their own uploads
    if (req.user.role !== 'Admin') {
        query.uploadedBy = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [uploads, total] = await Promise.all([
        UploadJob.find(query)
            .populate('uploadedBy', 'name email role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        UploadJob.countDocuments(query)
    ]);

    res.json({
        success: true,
        count: uploads.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: uploads
    });
});

/**
 * @desc    Get upload statistics
 * @route   GET /api/upload/stats
 * @access  Private (Admin)
 */
exports.getUploadStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await UploadJob.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalRecords: { $sum: '$totalRecords' },
                totalMatched: { $sum: '$matchedRecords' },
                totalPartiallyMatched: { $sum: '$partiallyMatchedRecords' },
                totalUnmatched: { $sum: '$unmatchedRecords' },
                totalDuplicates: { $sum: '$duplicateRecords' }
            }
        }
    ]);

    const overall = await UploadJob.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalUploads: { $sum: 1 },
                totalRecords: { $sum: '$totalRecords' },
                avgRecordsPerUpload: { $avg: '$totalRecords' }
            }
        }
    ]);

    res.json({
        success: true,
        stats: {
            byStatus: stats,
            overall: overall[0] || {
                totalUploads: 0,
                totalRecords: 0,
                avgRecordsPerUpload: 0
            }
        }
    });
});

/**
 * @desc    Retry failed upload
 * @route   POST /api/upload/retry/:jobId
 * @access  Private (Admin only)
 */
exports.retryUpload = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const uploadJob = await UploadJob.findById(jobId);

    if (!uploadJob) {
        throw new NotFoundError('Upload job not found');
    }

    if (uploadJob.status !== 'Failed' && uploadJob.status !== 'PartiallyFailed') {
        throw new ValidationError('Only failed or partially failed jobs can be retried');
    }

    // Reset job status
    uploadJob.status = 'Pending';
    uploadJob.retryCount = (uploadJob.retryCount || 0) + 1;
    uploadJob.errorMessage = '';
    uploadJob.failureReason = '';
    uploadJob.progressPercent = 0;

    await uploadJob.save();

    // Re-add to queue (file should still exist)
    const filePath = path.join(__dirname, '../uploads', uploadJob.fileName);
    const fs = require('fs');

    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Original file no longer exists. Cannot retry.');
    }

    const fileType = path.extname(uploadJob.fileName).toLowerCase() === '.csv' ? 'csv' : 'excel';

    const queueJob = await fileProcessingQueue.add({
        uploadJobId: uploadJob._id.toString(),
        filePath,
        columnMapping: Object.fromEntries(uploadJob.columnMapping),
        userId: uploadJob.uploadedBy.toString(),
        fileType
    });

    uploadJob.queueJobId = queueJob.id.toString();
    await uploadJob.save();

    res.json({
        success: true,
        message: 'Upload job queued for retry',
        uploadJobId: uploadJob._id,
        queueJobId: queueJob.id
    });
});
