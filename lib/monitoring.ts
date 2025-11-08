/**
 * Monitoring and Observability Service
 *
 * Integrates with Sentry for error tracking and performance monitoring
 * Provides custom metrics and alerting
 */

// Initialize Sentry (if configured)
let Sentry: any = null

try {
  if (process.env.SENTRY_DSN) {
    // In production with Sentry configured:
    // Sentry = require('@sentry/nextjs')
    // Sentry.init({
    //   dsn: process.env.SENTRY_DSN,
    //   environment: process.env.NODE_ENV,
    //   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    //   debug: process.env.NODE_ENV !== 'production'
    // })
  }
} catch (error) {
  console.log('Sentry not configured')
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log an error to monitoring service
 */
export function logError(
  error: Error,
  context?: Record<string, any>,
  severity: ErrorSeverity = ErrorSeverity.ERROR
): void {
  if (Sentry) {
    Sentry.captureException(error, {
      level: severity,
      extra: context
    })
  } else {
    console.error(`[${severity.toUpperCase()}]`, error.message, context)
  }
}

/**
 * Log a message to monitoring service
 */
export function logMessage(
  message: string,
  level: ErrorSeverity = ErrorSeverity.INFO,
  context?: Record<string, any>
): void {
  if (Sentry) {
    Sentry.captureMessage(message, {
      level,
      extra: context
    })
  } else {
    console.log(`[${level.toUpperCase()}]`, message, context)
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string
  username: string
  email: string
  role: string
}): void {
  if (Sentry) {
    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    })
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (Sentry) {
    Sentry.setUser(null)
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
): void {
  if (Sentry) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      timestamp: Date.now() / 1000
    })
  }
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, operation: string): any {
  if (Sentry) {
    return Sentry.startTransaction({
      name,
      op: operation
    })
  }
  return {
    finish: () => {},
    setTag: () => {},
    setData: () => {}
  }
}

/**
 * Custom metrics tracking
 */
export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map()

  /**
   * Record a metric value
   */
  record(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
  }

  /**
   * Get metric statistics
   */
  getStats(name: string): {
    count: number
    sum: number
    avg: number
    min: number
    max: number
  } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    }
  }

  /**
   * Clear metrics
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name)
    } else {
      this.metrics.clear()
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [name, values] of this.metrics.entries()) {
      result[name] = this.getStats(name)
    }
    return result
  }
}

// Singleton metrics collector
export const metrics = new MetricsCollector()

/**
 * Health check interface
 */
export interface HealthCheck {
  name: string
  check: () => Promise<boolean>
}

/**
 * System health checker
 */
export class HealthChecker {
  private checks: HealthCheck[] = []

  /**
   * Register a health check
   */
  register(check: HealthCheck): void {
    this.checks.push(check)
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<{
    healthy: boolean
    checks: Record<string, boolean>
    timestamp: Date
  }> {
    const results: Record<string, boolean> = {}
    let allHealthy = true

    for (const check of this.checks) {
      try {
        results[check.name] = await check.check()
        if (!results[check.name]) {
          allHealthy = false
        }
      } catch (error) {
        results[check.name] = false
        allHealthy = false
        logError(error as Error, { check: check.name })
      }
    }

    return {
      healthy: allHealthy,
      checks: results,
      timestamp: new Date()
    }
  }
}

// Singleton health checker
export const health = new HealthChecker()

/**
 * Request tracking middleware
 */
export function trackRequest(
  method: string,
  path: string,
  duration: number,
  statusCode: number
): void {
  // Record metrics
  metrics.record('http.request.duration', duration)
  metrics.record(`http.request.${method.toLowerCase()}`, 1)
  metrics.record(`http.status.${Math.floor(statusCode / 100)}xx`, 1)

  // Add breadcrumb
  addBreadcrumb(`${method} ${path}`, 'http', {
    method,
    path,
    duration,
    statusCode
  })

  // Log slow requests
  if (duration > 1000) {
    logMessage(`Slow request: ${method} ${path} took ${duration}ms`, ErrorSeverity.WARNING, {
      method,
      path,
      duration,
      statusCode
    })
  }
}

/**
 * Database query tracking
 */
export function trackQuery(query: string, duration: number): void {
  metrics.record('db.query.duration', duration)

  if (duration > 100) {
    logMessage(`Slow query: ${query} took ${duration}ms`, ErrorSeverity.WARNING, {
      query,
      duration
    })
  }
}

/**
 * Alert on critical metrics
 */
export function checkAlerts(): void {
  const errorRate = metrics.getStats('http.status.5xx')
  if (errorRate && errorRate.count > 10) {
    logMessage(`High error rate: ${errorRate.count} 5xx errors`, ErrorSeverity.ERROR, {
      errorCount: errorRate.count
    })
  }

  const avgDuration = metrics.getStats('http.request.duration')
  if (avgDuration && avgDuration.avg > 500) {
    logMessage(`High average response time: ${avgDuration.avg}ms`, ErrorSeverity.WARNING, {
      avgDuration: avgDuration.avg
    })
  }
}

/**
 * Export metrics for external monitoring (Prometheus, etc.)
 */
export function exportMetrics(): string {
  const allMetrics = metrics.getAllMetrics()
  let output = ''

  for (const [name, stats] of Object.entries(allMetrics)) {
    if (!stats) continue
    output += `# TYPE ${name} summary\n`
    output += `${name}_sum ${stats.sum}\n`
    output += `${name}_count ${stats.count}\n`
    output += `${name}_avg ${stats.avg}\n`
    output += `${name}_min ${stats.min}\n`
    output += `${name}_max ${stats.max}\n`
  }

  return output
}

// Register default health checks
health.register({
  name: 'database',
  check: async () => {
    try {
      const { prisma } = require('./prisma')
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      return false
    }
  }
})

health.register({
  name: 'redis',
  check: async () => {
    try {
      const { redis } = require('./redis')
      if (!redis) return true // Redis is optional
      await redis.ping()
      return true
    } catch (error) {
      return true // Redis failures are non-critical (graceful degradation)
    }
  }
})
