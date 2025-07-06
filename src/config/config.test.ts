import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to clear config cache
    vi.resetModules();
    
    // Create a copy of the original env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('with default values', () => {
    it('should load config with defaults', async () => {
      process.env.NODE_ENV = 'test';
      
      const { config } = await import('./index');
      
      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe('0.0.0.0');
      expect(config.tams.apiUrl).toBe('http://localhost:4010');
      expect(config.storage.type).toBe('ipfs');
      expect(config.app.environment).toBe('test');
    });
  });

  describe('with custom environment variables', () => {
    it('should load config from environment', async () => {
      process.env.PORT = '8080';
      process.env.TAMS_API_URL = 'http://tams.example.com';
      process.env.TAMS_AUTH_TOKEN = 'secret-token';
      process.env.STORAGE_TYPE = 'ipfs';
      process.env.IPFS_API_URL = 'http://ipfs.example.com:5001';
      process.env.IPFS_GATEWAY_URL = 'http://gateway.example.com';
      process.env.LENS_NETWORK_ID = 'custom-network';
      process.env.LENS_BOOTSTRAP_PEERS = '/dns4/peer1.com/tcp/4001/p2p/Qm123,/dns4/peer2.com/tcp/4001/p2p/Qm456';
      
      const { config } = await import('./index');
      
      expect(config.server.port).toBe(8080);
      expect(config.tams.apiUrl).toBe('http://tams.example.com');
      expect(config.tams.authToken).toBe('secret-token');
      expect(config.storage.ipfs?.apiUrl).toBe('http://ipfs.example.com:5001');
      expect(config.storage.ipfs?.gatewayUrl).toBe('http://gateway.example.com');
      expect(config.lens.networkId).toBe('custom-network');
      expect(config.lens.bootstrapPeers).toHaveLength(2);
      expect(config.lens.bootstrapPeers[0]).toBe('/dns4/peer1.com/tcp/4001/p2p/Qm123');
    });
  });

  describe('with S3 storage', () => {
    it('should configure S3 storage', async () => {
      process.env.STORAGE_TYPE = 's3';
      process.env.S3_STORAGE_BUCKET = 'my-bucket';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      
      const { config } = await import('./index');
      
      expect(config.storage.type).toBe('s3');
      expect(config.storage.s3?.bucket).toBe('my-bucket');
      expect(config.storage.s3?.region).toBe('us-east-1');
      expect(config.storage.s3?.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(config.storage.s3?.secretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    });

    it('should throw error for missing S3 config', async () => {
      process.env.STORAGE_TYPE = 's3';
      // Missing required S3 environment variables
      
      await expect(import('./index')).rejects.toThrow('Missing required environment variable: S3_STORAGE_BUCKET');
    });
  });

  describe('validation', () => {
    it('should validate valid configuration', async () => {
      process.env.TAMS_API_URL = 'http://localhost:4010';
      process.env.PORT = '3000';
      
      const { validateConfig } = await import('./index');
      
      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw for invalid TAMS URL', async () => {
      process.env.TAMS_API_URL = 'not-a-url';
      
      const { validateConfig } = await import('./index');
      
      expect(() => validateConfig()).toThrow('Invalid TAMS_API_URL');
    });

    it('should throw for invalid IPFS URLs', async () => {
      process.env.STORAGE_TYPE = 'ipfs';
      process.env.IPFS_API_URL = 'not-a-url';
      
      const { validateConfig } = await import('./index');
      
      expect(() => validateConfig()).toThrow('Invalid IPFS URL configuration');
    });

    it('should throw for invalid port number', async () => {
      process.env.PORT = '99999';
      
      const { validateConfig } = await import('./index');
      
      expect(() => validateConfig()).toThrow('Invalid port number: 99999');
    });

    it('should throw for non-numeric port', async () => {
      process.env.PORT = 'abc';
      
      await expect(import('./index')).rejects.toThrow('Invalid number for environment variable PORT: abc');
    });
  });

  describe('bootstrap peers parsing', () => {
    it('should parse empty bootstrap peers', async () => {
      process.env.LENS_BOOTSTRAP_PEERS = '';
      
      const { config } = await import('./index');
      
      expect(config.lens.bootstrapPeers).toEqual([]);
    });

    it('should parse single bootstrap peer', async () => {
      process.env.LENS_BOOTSTRAP_PEERS = '/dns4/peer.com/tcp/4001/p2p/Qm123';
      
      const { config } = await import('./index');
      
      expect(config.lens.bootstrapPeers).toEqual(['/dns4/peer.com/tcp/4001/p2p/Qm123']);
    });

    it('should parse multiple bootstrap peers with whitespace', async () => {
      process.env.LENS_BOOTSTRAP_PEERS = ' /dns4/peer1.com/tcp/4001/p2p/Qm123 , /dns4/peer2.com/tcp/4001/p2p/Qm456 ';
      
      const { config } = await import('./index');
      
      expect(config.lens.bootstrapPeers).toHaveLength(2);
      expect(config.lens.bootstrapPeers[0]).toBe('/dns4/peer1.com/tcp/4001/p2p/Qm123');
      expect(config.lens.bootstrapPeers[1]).toBe('/dns4/peer2.com/tcp/4001/p2p/Qm456');
    });
  });

  describe('exported config sections', () => {
    it('should export individual config sections', async () => {
      const { serverConfig, tamsConfig, storageConfig, lensConfig, appConfig } = await import('./index');
      
      expect(serverConfig).toBeDefined();
      expect(serverConfig.port).toBe(3000);
      
      expect(tamsConfig).toBeDefined();
      expect(tamsConfig.apiUrl).toBe('http://localhost:4010');
      
      expect(storageConfig).toBeDefined();
      expect(storageConfig.type).toBe('ipfs');
      
      expect(lensConfig).toBeDefined();
      expect(lensConfig.networkId).toBe('river-network');
      
      expect(appConfig).toBeDefined();
      expect(appConfig.environment).toBe('test');
    });
  });
});