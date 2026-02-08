const Queue = require('bull');
const Redis = require('ioredis');

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// File processing queue
const fileProcessingQueue = new Queue('file-processing', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200 // Keep last 200 failed jobs
    }
});

// Reconciliation queue
const reconciliationQueue = new Queue('reconciliation', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 3000
        },
        removeOnComplete: 50,
        removeOnFail: 100
    }
});

// Queue event handlers
fileProcessingQueue.on('error', (error) => {
    console.error('File processing queue error:', error);
});

fileProcessingQueue.on('waiting', (jobId) => {
    console.log(`Job ${jobId} is waiting`);
});

fileProcessingQueue.on('active', (job) => {
    console.log(`Job ${job.id} has started processing`);
});

fileProcessingQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed successfully`);
});

fileProcessingQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
});

fileProcessingQueue.on('progress', (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
});

// Reconciliation queue events
reconciliationQueue.on('error', (error) => {
    console.error('Reconciliation queue error:', error);
});

reconciliationQueue.on('completed', (job, result) => {
    console.log(`Reconciliation job ${job.id} completed`);
});

reconciliationQueue.on('failed', (job, err) => {
    console.error(`Reconciliation job ${job.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing queues...');
    await fileProcessingQueue.close();
    await reconciliationQueue.close();
    await redisClient.quit();
    process.exit(0);
});

module.exports = {
    fileProcessingQueue,
    reconciliationQueue,
    redisClient
};
