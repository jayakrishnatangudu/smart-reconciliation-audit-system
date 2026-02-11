const Queue = require('bull');
const Redis = require('ioredis');

// Redis configuration
const redisUrl = process.env.REDIS_URL;
const isUpstash = redisUrl?.includes('upstash') || process.env.REDIS_HOST?.includes('upstash');

// For Upstash: ensure we use TLS (rediss://) 
const finalRedisUrl = redisUrl
    ? (isUpstash && !redisUrl.startsWith('rediss://') ? redisUrl.replace('redis://', 'rediss://') : redisUrl)
    : null;

// Redis options for Bull queues - Bull requires maxRetriesPerRequest: null
const redisOptions = finalRedisUrl
    ? { redis: finalRedisUrl }
    : {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            ...((process.env.REDIS_TLS === 'true' || isUpstash) && {
                tls: { rejectUnauthorized: false }
            })
        }
    };

// Create a standalone Redis client for non-queue usage (e.g., caching)
const redisClient = finalRedisUrl
    ? new Redis(finalRedisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        ...((process.env.REDIS_TLS === 'true' || isUpstash) && {
            tls: { rejectUnauthorized: false }
        })
    });

// File processing queue - let Bull manage its own Redis connections
const fileProcessingQueue = new Queue('file-processing', finalRedisUrl || '', {
    ...(!finalRedisUrl && redisOptions),
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200
    }
});

// Reconciliation queue - let Bull manage its own Redis connections  
const reconciliationQueue = new Queue('reconciliation', finalRedisUrl || '', {
    ...(!finalRedisUrl && redisOptions),
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 3000 },
        removeOnComplete: 50,
        removeOnFail: 100
    }
});

// Queue event handlers
fileProcessingQueue.on('error', (error) => {
    console.error('File processing queue error:', error.message);
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
    console.error('Reconciliation queue error:', error.message);
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
