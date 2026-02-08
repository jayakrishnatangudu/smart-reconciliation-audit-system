require('dotenv').config();
const mongoose = require('mongoose');
const { fileProcessingQueue, reconciliationQueue } = require('./config/queue');
const fileProcessingService = require('./services/fileProcessingService');
const reconciliationService = require('./services/reconciliationService');
const Record = require('./models/Record');
const UploadJob = require('./models/UploadJob');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Worker: MongoDB Connected');
    } catch (error) {
        console.error('Worker: MongoDB connection error:', error);
        process.exit(1);
    }
};

connectDB();

// Process file upload jobs
fileProcessingQueue.process(async (job) => {
    const { uploadJobId, filePath, columnMapping, userId, fileType } = job.data;

    console.log(`Processing file job ${job.id} for uploadJobId: ${uploadJobId}`);

    try {
        await job.progress(10);

        // Process file using the service
        await fileProcessingService.processFileAsync(
            uploadJobId,
            filePath,
            columnMapping,
            userId,
            fileType,
            (progress) => {
                // Update job progress
                job.progress(progress);
            }
        );

        await job.progress(100);

        return { success: true, uploadJobId };
    } catch (error) {
        console.error(`File processing job ${job.id} failed:`, error);
        throw error;
    }
});

// Process reconciliation jobs
reconciliationQueue.process(async (job) => {
    const { uploadJobId, recordIds, userId } = job.data;

    console.log(`Processing reconciliation job ${job.id} for uploadJobId: ${uploadJobId}`);

    try {
        await job.progress(10);

        // Fetch records
        const records = await Record.find({ _id: { $in: recordIds } });

        await job.progress(30);

        // Perform reconciliation
        const results = await reconciliationService.reconcileRecords(
            uploadJobId,
            records,
            userId
        );

        await job.progress(80);

        // Update upload job statistics
        const stats = fileProcessingService.calculateStats(results);
        await UploadJob.findByIdAndUpdate(uploadJobId, {
            matchedRecords: stats.matched,
            partiallyMatchedRecords: stats.partiallyMatched,
            unmatchedRecords: stats.unmatched,
            duplicateRecords: stats.duplicate
        });

        await job.progress(100);

        return { success: true, results: results.length };
    } catch (error) {
        console.error(`Reconciliation job ${job.id} failed:`, error);
        throw error;
    }
});

console.log('Worker process started and listening for jobs...');
console.log('File Processing Queue: Ready');
console.log('Reconciliation Queue: Ready');

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await fileProcessingQueue.close();
    await reconciliationQueue.close();
    await mongoose.connection.close();
    process.exit(0);
});
