// Retry logic utilities for failed operations

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryCondition?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: any
  attempts: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Default: retry on network errors and 5xx server errors
    if (error?.type === 'NETWORK_ERROR' || error?.type === 'TIMEOUT_ERROR') {
      return true
    }
    if (error?.statusCode >= 500) {
      return true
    }
    return false
  }
}

export class RetryManager {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  async execute<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = { ...this.config, ...customConfig }
    let lastError: any
    let attempt = 0

    while (attempt < config.maxAttempts) {
      attempt++

      try {
        const result = await operation()
        return {
          success: true,
          data: result,
          attempts: attempt
        }
      } catch (error) {
        lastError = error

        // Check if we should retry
        const shouldRetry = attempt < config.maxAttempts && 
                           (config.retryCondition ? config.retryCondition(error) : true)

        if (!shouldRetry) {
          break
        }

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(attempt, error)
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        )

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000

        await this.sleep(jitteredDelay)
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: attempt
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Create default retry manager instance
export const defaultRetryManager = new RetryManager()

// Convenience function for simple retry operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const result = await defaultRetryManager.execute(operation, config)
  
  if (result.success) {
    return result.data!
  } else {
    throw result.error
  }
}

// Specialized retry configurations for different scenarios
export const RETRY_CONFIGS = {
  // For API calls
  API_CALL: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryCondition: (error: any) => {
      return error?.type === 'NETWORK_ERROR' || 
             error?.type === 'TIMEOUT_ERROR' ||
             (error?.statusCode >= 500 && error?.statusCode < 600)
    }
  },

  // For file uploads
  FILE_UPLOAD: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 1.5,
    retryCondition: (error: any) => {
      return error?.type === 'NETWORK_ERROR' || 
             error?.type === 'TIMEOUT_ERROR' ||
             error?.statusCode === 503 || 
             error?.statusCode === 502
    }
  },

  // For authentication
  AUTH: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    retryCondition: (error: any) => {
      return error?.type === 'NETWORK_ERROR' || 
             error?.type === 'TIMEOUT_ERROR'
    }
  },

  // For critical operations
  CRITICAL: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 8000,
    backoffMultiplier: 1.8,
    retryCondition: (error: any) => {
      // Retry everything except authentication and validation errors
      return error?.type !== 'AUTHENTICATION_ERROR' && 
             error?.type !== 'AUTHORIZATION_ERROR' &&
             error?.type !== 'VALIDATION_ERROR'
    }
  }
} as const

// Hook for using retry logic in React components
export function useRetry() {
  const executeWithRetry = async <T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> => {
    const retryManager = new RetryManager(config)
    return retryManager.execute(operation)
  }

  const retryOperation = async <T>(
    operation: () => Promise<T>,
    configName?: keyof typeof RETRY_CONFIGS
  ): Promise<T> => {
    const config = configName ? RETRY_CONFIGS[configName] : undefined
    return withRetry(operation, config)
  }

  return {
    executeWithRetry,
    retryOperation,
    withRetry,
    RETRY_CONFIGS
  }
}

// Utility for creating retryable API client methods
export function createRetryableMethod<TArgs extends any[], TReturn>(
  method: (...args: TArgs) => Promise<TReturn>,
  config?: Partial<RetryConfig>
) {
  return async (...args: TArgs): Promise<TReturn> => {
    return withRetry(() => method(...args), config)
  }
}

// Queue for managing retry operations
export class RetryQueue {
  private queue: Array<{
    id: string
    operation: () => Promise<any>
    config: RetryConfig
    resolve: (value: any) => void
    reject: (error: any) => void
  }> = []
  
  private processing = false
  private maxConcurrent = 3
  private currentlyProcessing = 0

  async add<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      this.queue.push({
        id,
        operation,
        config: { ...DEFAULT_RETRY_CONFIG, ...config },
        resolve,
        reject
      })

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.currentlyProcessing >= this.maxConcurrent) {
      return
    }

    this.processing = true

    while (this.queue.length > 0 && this.currentlyProcessing < this.maxConcurrent) {
      const item = this.queue.shift()
      if (!item) break

      this.currentlyProcessing++
      
      // Process item asynchronously
      this.processItem(item).finally(() => {
        this.currentlyProcessing--
        this.processQueue() // Continue processing
      })
    }

    this.processing = false
  }

  private async processItem(item: {
    id: string
    operation: () => Promise<any>
    config: RetryConfig
    resolve: (value: any) => void
    reject: (error: any) => void
  }) {
    const retryManager = new RetryManager(item.config)
    
    try {
      const result = await retryManager.execute(item.operation)
      
      if (result.success) {
        item.resolve(result.data)
      } else {
        item.reject(result.error)
      }
    } catch (error) {
      item.reject(error)
    }
  }

  getQueueLength(): number {
    return this.queue.length
  }

  clear() {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'))
    })
    this.queue = []
  }
}

// Global retry queue instance
export const globalRetryQueue = new RetryQueue()