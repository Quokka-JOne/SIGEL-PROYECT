import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
}

const LOGS_DIR = path.resolve(__dirname, '../../logs');
const COMBINED_LOG = path.join(LOGS_DIR, 'combined.log');
const ERROR_LOG = path.join(LOGS_DIR, 'error.log');

// Asegurar que el directorio de logs exista
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (err) {
  // En entornos de solo lectura (como serverless extremo), continuar con stdout
}

const writeToFile = (filePath: string, line: string) => {
  try {
    fs.appendFileSync(filePath, line + '\n', 'utf8');
  } catch {
    // Si el filesystem es de solo lectura, se ignora silenciosamente
  }
};

class Logger {
  private format(level: LogLevel, message: string, context?: Record<string, any>, error?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        code: error.code || error.name,
        message: error.message || String(error),
        ...(process.env.NODE_ENV !== 'production' && error.stack ? { stack: error.stack } : {}),
      };
    }

    return entry;
  }

  private output(entry: LogEntry) {
    const jsonString = JSON.stringify(entry);

    if (entry.level === 'ERROR') {
      console.error(jsonString);
      writeToFile(ERROR_LOG, jsonString);
    } else if (entry.level === 'WARN') {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }

    writeToFile(COMBINED_LOG, jsonString);
  }

  info(message: string, context?: Record<string, any>) {
    this.output(this.format('INFO', message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    this.output(this.format('WARN', message, context));
  }

  error(message: string, error?: any, context?: Record<string, any>) {
    this.output(this.format('ERROR', message, context, error));
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV !== 'production') {
      this.output(this.format('DEBUG', message, context));
    }
  }

  /**
   * Obtiene los últimos logs guardados en archivo para demostración de auditoría
   */
  getRecentLogs(limit: number = 50, type: 'all' | 'error' = 'all'): LogEntry[] {
    const targetFile = type === 'error' ? ERROR_LOG : COMBINED_LOG;
    if (!fs.existsSync(targetFile)) {
      return [];
    }
    try {
      const content = fs.readFileSync(targetFile, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines
        .slice(-limit)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as LogEntry[];
    } catch {
      return [];
    }
  }
}

export const logger = new Logger();

/**
 * Middleware para registrar todas las peticiones entrantes con latencia y status
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const statusCode = res.statusCode;
    const level: LogLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';

    const logEntry = {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs,
      ip: ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
    };

    if (level === 'ERROR') {
      logger.error(`HTTP ${method} ${originalUrl} ${statusCode} (${durationMs}ms)`, undefined, logEntry);
    } else if (level === 'WARN') {
      logger.warn(`HTTP ${method} ${originalUrl} ${statusCode} (${durationMs}ms)`, logEntry);
    } else {
      logger.info(`HTTP ${method} ${originalUrl} ${statusCode} (${durationMs}ms)`, logEntry);
    }
  });

  next();
};
