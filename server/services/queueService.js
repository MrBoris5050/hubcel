const QueueJob = require('../models/QueueJob');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Beneficiary = require('../models/Beneficiary');
const DataRequest = require('../models/DataRequest');
const TelecelService = require('./telecelService');
const creditService = require('./creditService');

class QueueService {
  constructor() {
    this.telecel = new TelecelService();
    this.processing = false;
    this.tokenPaused = false;
    this.pollInterval = null;
    this.DELAY_BETWEEN_JOBS_MS = 2000; // 2s gap between API calls
  }

  // Start the queue processor (called once on server boot)
  start() {
    console.log('[QUEUE] Queue processor started');
    // Poll for pending jobs every 3 seconds
    this.pollInterval = setInterval(() => this.processNext(), 3000);
    // Also process immediately on start
    this.processNext();
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('[QUEUE] Queue processor stopped');
  }

  // Add a job to the queue
  async enqueue({ user, subscription, beneficiary, beneficiaryName, beneficiaryPhone, dataGB, priority = 0 }) {
    const job = await QueueJob.create({
      user,
      subscription,
      beneficiary,
      beneficiaryName,
      beneficiaryPhone,
      dataGB,
      priority,
      status: 'pending'
    });

    console.log(`[QUEUE] Job ${job._id} enqueued: ${dataGB}GB -> ${beneficiaryPhone}`);

    // Kick off processing immediately
    setImmediate(() => this.processNext());

    return job;
  }

  // Add multiple jobs at once (bulk)
  async enqueueBulk(jobs) {
    const created = await QueueJob.insertMany(
      jobs.map((j, i) => ({
        ...j,
        status: 'pending',
        priority: j.priority || 0
      }))
    );
    console.log(`[QUEUE] ${created.length} jobs enqueued (bulk)`);
    setImmediate(() => this.processNext());
    return created;
  }

  // Process the next pending job (one at a time)
  async processNext() {
    if (this.processing) return; // already processing one
    if (this.tokenPaused) return; // waiting for token refresh
    this.processing = true;

    try {
      // Grab the next pending job (highest priority first, then oldest)
      const job = await QueueJob.findOneAndUpdate(
        { status: 'pending' },
        { $set: { status: 'processing' }, $inc: { attempts: 1 } },
        { sort: { priority: -1, createdAt: 1 }, new: true }
      );

      if (!job) {
        this.processing = false;
        return; // nothing to process
      }

      console.log(`[QUEUE] Processing job ${job._id}: ${job.dataGB}GB -> ${job.beneficiaryPhone} (attempt ${job.attempts})`);

      const isCredit = job.sourceType === 'credit';

      // For subscription-based jobs, check subscription
      if (!isCredit) {
        const subscription = await Subscription.findById(job.subscription);
        if (!subscription || subscription.status !== 'active') {
          await this.failJob(job, 'Subscription no longer active');
          this.processing = false;
          return;
        }

        if (subscription.remainingDataGB < job.dataGB) {
          await this.failJob(job, `Insufficient data. Remaining: ${subscription.remainingDataGB}GB, needed: ${job.dataGB}GB`);
          this.processing = false;
          return;
        }
      }

      // Call Telecel API
      const result = await this.telecel.sendDataBundle(job.beneficiaryPhone, job.dataGB);

      // Create transaction record
      const transaction = await Transaction.create({
        user: job.user,
        subscription: job.subscription || undefined,
        beneficiary: job.beneficiary || undefined,
        beneficiaryName: job.beneficiaryName,
        beneficiaryPhone: job.beneficiaryPhone,
        dataGB: job.dataGB,
        transactionId: result.transactionId || this.telecel.generateTransactionId(),
        status: result.success ? 'success' : 'failed',
        telecelResponse: result.data || result.details,
        errorMessage: result.error,
        requiresNewToken: result.requiresNewToken || false,
        sourceType: isCredit ? 'credit' : 'subscription'
      });

      if (result.success) {
        if (!isCredit) {
          // Deduct from subscription
          const subscription = await Subscription.findById(job.subscription);
          subscription.remainingDataGB -= job.dataGB;
          subscription.usedDataGB += job.dataGB;
          await subscription.save();

          // Update beneficiary stats
          await Beneficiary.findByIdAndUpdate(job.beneficiary, {
            $inc: { totalSentGB: job.dataGB },
            $set: { lastSentAt: new Date() }
          });
        }

        // Update data request status if applicable
        if (job.dataRequest) {
          await DataRequest.findByIdAndUpdate(job.dataRequest, {
            status: 'completed',
            transaction: transaction._id
          });
        }

        // Mark job completed
        job.status = 'completed';
        job.result = {
          success: true,
          transactionId: transaction.transactionId,
          message: `Sent ${job.dataGB}GB to ${job.beneficiaryPhone}`,
          statusCode: result.statusCode
        };
        job.transaction = transaction._id;
        job.processedAt = new Date();
        await job.save();

        console.log(`[QUEUE] Job ${job._id} completed successfully`);
      } else {
        // If token expired, pause this job and all pending jobs until token is refreshed
        if (result.requiresNewToken) {
          // Delete the failed transaction record — job will be retried
          await Transaction.findByIdAndDelete(transaction._id);

          job.status = 'paused';
          job.attempts = Math.max(0, job.attempts - 1); // don't count token failure as an attempt
          job.error = 'Token expired - waiting for new token';
          await job.save();

          // Pause all remaining pending jobs
          const paused = await QueueJob.updateMany(
            { status: 'pending' },
            { $set: { status: 'paused', error: 'Token expired - waiting for new token' } }
          );

          this.tokenPaused = true;
          console.log(`[QUEUE] Token expired - paused ${paused.modifiedCount + 1} jobs. Waiting for new token...`);
        } else if (job.attempts < job.maxAttempts) {
          // Retry later
          job.status = 'pending';
          job.error = result.error;
          await job.save();
          console.log(`[QUEUE] Job ${job._id} will retry (attempt ${job.attempts}/${job.maxAttempts}). Error: ${result.error} (status: ${result.statusCode})`);
        } else {
          // Max attempts reached
          job.status = 'failed';
          job.result = {
            success: false,
            message: result.error,
            requiresNewToken: result.requiresNewToken,
            statusCode: result.statusCode
          };
          job.transaction = transaction._id;
          job.processedAt = new Date();
          job.error = result.error;
          await job.save();

          // Refund credit for failed credit-based jobs
          if (isCredit) {
            try {
              if (job.creditType === 'ghs' && job.refundAmountGHS) {
                await creditService.refundGHSCredit(job.user, job.refundAmountGHS, job.user, `Send failed: ${result.error}`, job.dataRequest);
              } else {
                await creditService.refundCredit(job.user, job.dataGB, job.user, `Send failed: ${result.error}`, job.dataRequest);
              }
            } catch (e) { console.error('[QUEUE] Refund error:', e.message); }
          }

          // Update data request if applicable
          if (job.dataRequest) {
            await DataRequest.findByIdAndUpdate(job.dataRequest, { status: 'failed' });
          }

          console.log(`[QUEUE] Job ${job._id} failed after ${job.attempts} attempts. Error: ${result.error} (status: ${result.statusCode})`);
        }
      }
    } catch (error) {
      console.error('[QUEUE] Processing error:', error.message);
    }

    this.processing = false;

    // Wait before processing next to avoid hammering the API
    await new Promise((resolve) => setTimeout(resolve, this.DELAY_BETWEEN_JOBS_MS));

    // Check if there are more jobs
    const pendingCount = await QueueJob.countDocuments({ status: 'pending' });
    if (pendingCount > 0) {
      setImmediate(() => this.processNext());
    }
  }

  async failJob(job, errorMessage) {
    job.status = 'failed';
    job.error = errorMessage;
    job.result = { success: false, message: errorMessage };
    job.processedAt = new Date();
    await job.save();

    // Create a failed transaction record
    await Transaction.create({
      user: job.user,
      subscription: job.subscription || undefined,
      beneficiary: job.beneficiary || undefined,
      beneficiaryName: job.beneficiaryName,
      beneficiaryPhone: job.beneficiaryPhone,
      dataGB: job.dataGB,
      transactionId: this.telecel.generateTransactionId(),
      status: 'failed',
      errorMessage,
      sourceType: job.sourceType || 'subscription'
    });

    // Refund credit for credit-based jobs
    if (job.sourceType === 'credit') {
      try {
        if (job.creditType === 'ghs' && job.refundAmountGHS) {
          await creditService.refundGHSCredit(job.user, job.refundAmountGHS, job.user, `Failed: ${errorMessage}`, job.dataRequest);
        } else {
          await creditService.refundCredit(job.user, job.dataGB, job.user, `Failed: ${errorMessage}`, job.dataRequest);
        }
      } catch (e) { console.error('[QUEUE] Refund error:', e.message); }
    }

    // Update data request if applicable
    if (job.dataRequest) {
      await DataRequest.findByIdAndUpdate(job.dataRequest, { status: 'failed' });
    }

    console.log(`[QUEUE] Job ${job._id} failed: ${errorMessage}`);
  }

  // Resume all paused jobs (called when a new token is saved)
  async resumePaused() {
    const result = await QueueJob.updateMany(
      { status: 'paused' },
      { $set: { status: 'pending', error: null } }
    );
    this.tokenPaused = false;
    if (result.modifiedCount > 0) {
      console.log(`[QUEUE] Token refreshed - resumed ${result.modifiedCount} paused jobs`);
      setImmediate(() => this.processNext());
    }
    return { resumedCount: result.modifiedCount };
  }

  // Get queue status for a user
  async getStatus(userId) {
    const [pending, processing, completed, failed, paused] = await Promise.all([
      QueueJob.countDocuments({ user: userId, status: 'pending' }),
      QueueJob.countDocuments({ user: userId, status: 'processing' }),
      QueueJob.countDocuments({ user: userId, status: 'completed' }),
      QueueJob.countDocuments({ user: userId, status: 'failed' }),
      QueueJob.countDocuments({ user: userId, status: 'paused' })
    ]);
    return { pending, processing, completed, failed, paused, total: pending + processing + completed + failed + paused };
  }

  // Get jobs for a user with filters
  async getJobs(userId, { status, page = 1, limit = 20 } = {}) {
    const filter = { user: userId };
    if (status) filter.status = status;

    const [jobs, total] = await Promise.all([
      QueueJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('beneficiary', 'name phone')
        .populate('transaction', 'transactionId status'),
      QueueJob.countDocuments(filter)
    ]);

    return { jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // Retry failed jobs for a user
  async retryFailed(userId) {
    const result = await QueueJob.updateMany(
      { user: userId, status: 'failed' },
      { $set: { status: 'pending', error: null, attempts: 0 } }
    );
    if (result.modifiedCount > 0) {
      setImmediate(() => this.processNext());
    }
    return { retriedCount: result.modifiedCount };
  }

  // Cancel all pending jobs for a user
  async cancelPending(userId) {
    const result = await QueueJob.updateMany(
      { user: userId, status: 'pending' },
      { $set: { status: 'failed', error: 'Cancelled by user', processedAt: new Date() } }
    );
    return { cancelledCount: result.modifiedCount };
  }

  // Clear completed/failed jobs older than given days
  async cleanup(days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await QueueJob.deleteMany({
      status: { $in: ['completed', 'failed'] },
      processedAt: { $lt: cutoff }
    });
    return { deletedCount: result.deletedCount };
  }
}

// Singleton - one queue processor per server
const queueService = new QueueService();
module.exports = queueService;
