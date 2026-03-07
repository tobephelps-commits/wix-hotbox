import 'dotenv/config';

export interface Config {
  port: number;
  host: string;
  nodeEnv: string;
  dataDir: string;
  logDir: string;
}

export function loadConfig(): Config {
  const port = parseInt(process.env.PORT || '3456', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT} (must be 1-65535)`);
  }

  const host = process.env.HOST || '0.0.0.0';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const dataDir = process.env.DATA_DIR || './data';
  const logDir = process.env.LOG_DIR || './logs';

  return { port, host, nodeEnv, dataDir, logDir };
}
