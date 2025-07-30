export class Logger {
  private static formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };
    return JSON.stringify(logEntry);
  }

  static info(message: string, meta?: any): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  static warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  static error(message: string, meta?: any): void {
    console.error(this.formatMessage('ERROR', message, meta));
  }

  static debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }
}