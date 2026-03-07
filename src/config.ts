import 'dotenv/config';

export interface Config {
  port: number;
  host: string;
  nodeEnv: string;
  dataDir: string;
  logDir: string;

  // SanMar credentials (SOAP API)
  sanmarCustomerNumber: string | undefined;
  sanmarUsername: string | undefined;
  sanmarPassword: string | undefined;

  // S&S Activewear credentials (REST API)
  ssAccountNumber: string | undefined;
  ssApiKey: string | undefined;

  // WIX API credentials
  wixApiKey: string | undefined;
  wixSiteId: string | undefined;
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

  // SanMar credentials (SOAP API)
  const sanmarCustomerNumber = process.env.SANMAR_CUSTOMER_NUMBER;
  const sanmarUsername = process.env.SANMAR_USERNAME;
  const sanmarPassword = process.env.SANMAR_PASSWORD;

  // S&S Activewear credentials (REST API)
  const ssAccountNumber = process.env.SS_ACCOUNT_NUMBER;
  const ssApiKey = process.env.SS_API_KEY;

  // WIX API credentials
  const wixApiKey = process.env.WIX_API_KEY;
  const wixSiteId = process.env.WIX_SITE_ID || 'c744cbdb-46f8-4c66-ac76-eb31bd0d52c1';

  return {
    port, host, nodeEnv, dataDir, logDir,
    sanmarCustomerNumber, sanmarUsername, sanmarPassword,
    ssAccountNumber, ssApiKey,
    wixApiKey, wixSiteId,
  };
}
