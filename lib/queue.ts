import Queue from 'bull'
import { sendEmail, EmailTemplate } from './email'

// Initialize job queues
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

// Email queue
export const emailQueue = new Queue('email', redisUrl, {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
})

// File cleanup queue
export const cleanupQueue = new Queue('cleanup', redisUrl, {
  defaultJobOptions: {
    removeOnComplete: 50,
    attempts: 2
  }
})

// Analytics aggregation queue
export const analyticsQueue = new Queue('analytics', redisUrl, {
  defaultJobOptions: {
    removeOnComplete: 100
  }
})

// Email job processor
emailQueue.process(async (job) => {
  const { template } = job.data as { template: EmailTemplate }

  try {
    await sendEmail(template)
    return { success: true, emailTo: template.to }
  } catch (error) {
    console.error('Email job failed:', error)
    throw error
  }
})

// Cleanup job processor
cleanupQueue.process(async (job) => {
  const { type, data } = job.data

  console.log(`Processing cleanup job: ${type}`, data)

  // Add cleanup logic here
  // e.g., delete old files, remove expired tokens, etc.

  return { success: true, type }
})

// Analytics job processor
analyticsQueue.process(async (job) => {
  const { type, data } = job.data

  console.log(`Processing analytics job: ${type}`, data)

  // Add analytics aggregation logic here

  return { success: true, type }
})

// Queue event handlers
emailQueue.on('completed', (job, result) => {
  console.log(`✅ Email job ${job.id} completed:`, result)
})

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job?.id} failed:`, err.message)
})

cleanupQueue.on('completed', (job, result) => {
  console.log(`✅ Cleanup job ${job.id} completed`)
})

analyticsQueue.on('completed', (job, result) => {
  console.log(`✅ Analytics job ${job.id} completed`)
})

// Helper functions to add jobs
export async function queueEmail(template: EmailTemplate) {
  return await emailQueue.add({ template }, {
    priority: 1,
    timeout: 30000
  })
}

export async function queueCleanup(type: string, data: any) {
  return await cleanupQueue.add({ type, data })
}

export async function queueAnalytics(type: string, data: any) {
  return await analyticsQueue.add({ type, data })
}

// Scheduled jobs
export function setupScheduledJobs() {
  // Clean up expired tokens daily at 2 AM
  cleanupQueue.add(
    { type: 'cleanup-tokens', data: {} },
    { repeat: { cron: '0 2 * * *' } }
  )

  // Aggregate analytics daily at 3 AM
  analyticsQueue.add(
    { type: 'daily-analytics', data: {} },
    { repeat: { cron: '0 3 * * *' } }
  )

  console.log('✅ Scheduled jobs configured')
}
