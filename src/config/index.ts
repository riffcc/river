import { config as dotenvConfig } from 'dotenv';
import { StorageConfig } from '../storage/interfaces';

// Load environment variables
dotenvConfig();

export interface RiverConfig {
  // Server configuration
  server: {
    port: number;
    host: string;
  };

  // TAMS configuration
  tams: {
    apiUrl: string;
    authToken?: string;
  };

  // Storage configuration
  storage: StorageConfig;

  // Lens SDK configuration
  lens: {
    networkId: string;
    bootstrapPeers: string[];
  };

  // Application configuration
  app: {
    environment: 'development' | 'production' | 'test';
    logLevel: string;
    tempUploadDir: string;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvVarAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return num;
}

function getStorageConfig(): StorageConfig {
  const storageType = getEnvVar('STORAGE_TYPE', 'ipfs');
  
  if (storageType === 'ipfs') {
    return {
      type: 'ipfs',
      ipfs: {
        apiUrl: getEnvVar('IPFS_API_URL', 'http://localhost:5001'),
        gatewayUrl: getEnvVar('IPFS_GATEWAY_URL', 'http://localhost:8080'),
        timeout: getEnvVarAsNumber('IPFS_TIMEOUT', 30000),
      },
    };
  } else if (storageType === 's3') {
    return {
      type: 's3',
      s3: {
        bucket: getEnvVar('S3_STORAGE_BUCKET'),
        region: getEnvVar('AWS_REGION'),
        accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID'),
        secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY'),
      },
    };
  } else {
    throw new Error(`Invalid storage type: ${storageType}`);
  }
}

function parseBootstrapPeers(peersString: string): string[] {
  if (!peersString) return [];
  return peersString.split(',').map(peer => peer.trim()).filter(peer => peer);
}

export const config: RiverConfig = {
  server: {
    port: getEnvVarAsNumber('PORT', 3000),
    host: getEnvVar('HOST', '0.0.0.0'),
  },
  
  tams: {
    apiUrl: getEnvVar('TAMS_API_URL', 'http://localhost:4010'),
    authToken: process.env.TAMS_AUTH_TOKEN,
  },
  
  storage: getStorageConfig(),
  
  lens: {
    networkId: getEnvVar('LENS_NETWORK_ID', 'river-network'),
    bootstrapPeers: parseBootstrapPeers(getEnvVar('LENS_BOOTSTRAP_PEERS', '')),
  },
  
  app: {
    environment: (getEnvVar('NODE_ENV', 'development') as 'development' | 'production' | 'test'),
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
    tempUploadDir: getEnvVar('TEMP_UPLOAD_DIR', '/tmp/river-uploads'),
  },
};

// Validate configuration on load
export function validateConfig(): void {
  // Validate TAMS URL
  try {
    new URL(config.tams.apiUrl);
  } catch (error) {
    throw new Error(`Invalid TAMS_API_URL: ${config.tams.apiUrl}`);
  }
  
  // Validate IPFS URLs if using IPFS storage
  if (config.storage.type === 'ipfs' && config.storage.ipfs) {
    try {
      new URL(config.storage.ipfs.apiUrl);
      new URL(config.storage.ipfs.gatewayUrl);
    } catch (error) {
      throw new Error('Invalid IPFS URL configuration');
    }
  }
  
  // Validate port number
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error(`Invalid port number: ${config.server.port}`);
  }
}

// Export individual config sections for convenience
export const serverConfig = config.server;
export const tamsConfig = config.tams;
export const storageConfig = config.storage;
export const lensConfig = config.lens;
export const appConfig = config.app;