// Error logging and reporting utilities

export interface ErrorLog {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  context?: Record<string, any>
  userId?: string
  sessionId?: string
  userAgent?: string
  url?: string
  componentStack?: string
}

export interface ErrorReportingConfig {
  maxLogs: number
  enableConsoleLogging: boolean
  enableLocalStorage: boolean
  enableRemoteReporting: boolean
  remoteEndpoint?: string
}

class ErrorLogger {
  private config: ErrorReportingConfig
  private logs: ErrorLog[] = []

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      maxLogs: 100,
      enableConsoleLogging: true,
      enableLocalStorage: true,
      enableRemoteReporting: false,
      ...config
    }

    // Load existing logs from localStorage
    this.loadLogsFromStorage()

    // Set up global error handlers
    this.setupGlobalErrorHandlers()
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        {
          type: 'unhandledrejection',
          reason: event.reason
        }
      )
    })

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError(
        new Error(event.message),
        {
          type: 'javascript',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      )
    })

    // Handle custom error events
    window.addEventListener('errorBoundaryError', (event: any) => {
      this.logError(
        new Error(event.detail.message),
        {
          type: 'errorBoundary',
          componentStack: event.detail.componentStack,
          stack: event.detail.stack
        }
      )
    })

    window.addEventListener('manualErrorReport', (event: any) => {
      this.logError(
        new Error(event.detail.message),
        {
          type: 'manual',
          ...event.detail.context
        }
      )
    })
  }

  private loadLogsFromStorage() {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') return

    try {
      const storedLogs = localStorage.getItem('error-logs')
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs)
      }
    } catch (error) {
      console.error('Failed to load error logs from storage:', error)
    }
  }

  private saveLogsToStorage() {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') return

    try {
      localStorage.setItem('error-logs', JSON.stringify(this.logs))
    } catch (error) {
      console.error('Failed to save error logs to storage:', error)
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCurrentUserId(): string | undefined {
    try {
      if (typeof window === 'undefined') return undefined
      const authData = localStorage.getItem('auth-storage')
      if (authData) {
        const parsed = JSON.parse(authData)
        return parsed.state?.user?.id
      }
    } catch {
      return undefined
    }
    return undefined
  }

  private getSessionId(): string {
    try {
      if (typeof window === 'undefined') return 'server'
      let sessionId = sessionStorage.getItem('session-id')
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('session-id', sessionId)
      }
      return sessionId
    } catch {
      return 'unknown'
    }
  }

  public logError(error: Error, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    }

    this.addLog(errorLog)
  }

  public logWarning(message: string, context?: Record<string, any>) {
    const warningLog: ErrorLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    }

    this.addLog(warningLog)
  }

  public logInfo(message: string, context?: Record<string, any>) {
    const infoLog: ErrorLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    }

    this.addLog(infoLog)
  }

  private addLog(log: ErrorLog) {
    // Add to memory
    this.logs.push(log)

    // Maintain max logs limit
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs)
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      const logMethod = log.level === 'error' ? console.error : 
                      log.level === 'warning' ? console.warn : console.log
      
      logMethod(`[${log.level.toUpperCase()}] ${log.message}`, {
        timestamp: log.timestamp,
        context: log.context,
        stack: log.stack
      })
    }

    // Save to localStorage
    if (this.config.enableLocalStorage) {
      this.saveLogsToStorage()
    }

    // Remote reporting
    if (this.config.enableRemoteReporting && this.config.remoteEndpoint) {
      this.sendToRemote(log)
    }
  }

  private async sendToRemote(log: ErrorLog) {
    if (!this.config.remoteEndpoint) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(log)
      })
    } catch (error) {
      // Silently fail remote logging to avoid infinite loops
      if (this.config.enableConsoleLogging) {
        console.error('Failed to send error log to remote endpoint:', error)
      }
    }
  }

  public getLogs(filter?: {
    level?: ErrorLog['level']
    startDate?: Date
    endDate?: Date
    userId?: string
  }): ErrorLog[] {
    let filteredLogs = [...this.logs]

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level)
      }

      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= filter.startDate!
        )
      }

      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= filter.endDate!
        )
      }

      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId)
      }
    }

    return filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  public clearLogs() {
    this.logs = []
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      localStorage.removeItem('error-logs')
    }
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  public getLogStats(): {
    total: number
    errors: number
    warnings: number
    info: number
    last24Hours: number
  } {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    return {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warning').length,
      info: this.logs.filter(log => log.level === 'info').length,
      last24Hours: this.logs.filter(log => 
        new Date(log.timestamp) >= yesterday
      ).length
    }
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger({
  maxLogs: 100,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableLocalStorage: true,
  enableRemoteReporting: false // Can be enabled when backend endpoint is available
})

// Convenience functions
export const logError = (error: Error, context?: Record<string, any>) => {
  errorLogger.logError(error, context)
}

export const logWarning = (message: string, context?: Record<string, any>) => {
  errorLogger.logWarning(message, context)
}

export const logInfo = (message: string, context?: Record<string, any>) => {
  errorLogger.logInfo(message, context)
}

// Hook for accessing error logger in components
export function useErrorLogger() {
  return {
    logError: errorLogger.logError.bind(errorLogger),
    logWarning: errorLogger.logWarning.bind(errorLogger),
    logInfo: errorLogger.logInfo.bind(errorLogger),
    getLogs: errorLogger.getLogs.bind(errorLogger),
    clearLogs: errorLogger.clearLogs.bind(errorLogger),
    exportLogs: errorLogger.exportLogs.bind(errorLogger),
    getLogStats: errorLogger.getLogStats.bind(errorLogger)
  }
}