import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { IPFSAdapter } from './ipfs-adapter';
import * as IpfsHttpClient from 'ipfs-http-client';

// Mock IPFS HTTP client
vi.mock('ipfs-http-client', () => ({
  create: vi.fn(),
}));

describe('IPFSAdapter', () => {
  let adapter: IPFSAdapter;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock IPFS client
    mockClient = {
      add: vi.fn(),
      cat: vi.fn(),
      object: {
        stat: vi.fn(),
      },
      pin: {
        add: vi.fn(),
        rm: vi.fn(),
        ls: vi.fn(),
      },
    };

    // Mock the create function to return our mock client
    (IpfsHttpClient.create as Mock).mockReturnValue(mockClient);

    // Create adapter instance
    adapter = new IPFSAdapter('http://localhost:5001', 'http://localhost:8080');
  });

  describe('constructor', () => {
    it('should create IPFS client with correct URL', () => {
      expect(IpfsHttpClient.create).toHaveBeenCalledWith({
        url: 'http://localhost:5001',
      });
    });
  });

  describe('store', () => {
    it('should store data and return CID', async () => {
      const testData = Buffer.from('test content');
      const mockCid = { toString: () => 'QmTestCid123' };
      mockClient.add.mockResolvedValue({ cid: mockCid });

      const cid = await adapter.store(testData);

      expect(mockClient.add).toHaveBeenCalledWith(testData, {
        pin: true,
        onlyHash: false,
        timeout: 30000,
      });
      expect(cid).toBe('QmTestCid123');
    });

    it('should store data without pinning when pin is false', async () => {
      const testData = Buffer.from('test content');
      const mockCid = { toString: () => 'QmTestCid123' };
      mockClient.add.mockResolvedValue({ cid: mockCid });

      await adapter.store(testData, { pin: false });

      expect(mockClient.add).toHaveBeenCalledWith(testData, {
        pin: false,
        onlyHash: false,
        timeout: 30000,
      });
    });

    it('should handle onlyHash option', async () => {
      const testData = Buffer.from('test content');
      const mockCid = { toString: () => 'QmTestCid123' };
      mockClient.add.mockResolvedValue({ cid: mockCid });

      await adapter.store(testData, { onlyHash: true });

      expect(mockClient.add).toHaveBeenCalledWith(testData, {
        pin: true,
        onlyHash: true,
        timeout: 30000,
      });
    });

    it('should throw error when store fails', async () => {
      const testData = Buffer.from('test content');
      mockClient.add.mockRejectedValue(new Error('IPFS connection failed'));

      await expect(adapter.store(testData)).rejects.toThrow('IPFS store failed: IPFS connection failed');
    });
  });

  describe('retrieve', () => {
    it('should retrieve data by CID', async () => {
      const testCid = 'QmTestCid123';
      const chunks = [
        new Uint8Array([72, 101, 108]), // "Hel"
        new Uint8Array([108, 111]),      // "lo"
      ];

      // Mock async iterator for cat
      mockClient.cat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      });

      const result = await adapter.retrieve(testCid);

      expect(mockClient.cat).toHaveBeenCalledWith(testCid);
      expect(result.toString()).toBe('Hello');
    });

    it('should throw error when retrieve fails', async () => {
      const testCid = 'QmTestCid123';
      
      // Mock cat to throw an error when called
      mockClient.cat.mockImplementation(() => {
        throw new Error('Content not found');
      });

      await expect(adapter.retrieve(testCid)).rejects.toThrow('IPFS retrieve failed:');
    });
  });

  describe('exists', () => {
    it('should return true when content exists', async () => {
      const testCid = 'QmTestCid123';
      mockClient.object.stat.mockResolvedValue({});

      const exists = await adapter.exists(testCid);

      expect(mockClient.object.stat).toHaveBeenCalledWith(testCid, { timeout: 5000 });
      expect(exists).toBe(true);
    });

    it('should return false when content does not exist', async () => {
      const testCid = 'QmTestCid123';
      mockClient.object.stat.mockRejectedValue(new Error('ipfs: not found'));

      const exists = await adapter.exists(testCid);

      expect(exists).toBe(false);
    });

    it('should re-throw non-not-found errors', async () => {
      const testCid = 'QmTestCid123';
      mockClient.object.stat.mockRejectedValue(new Error('Connection failed'));

      await expect(adapter.exists(testCid)).rejects.toThrow('Connection failed');
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for content', async () => {
      const testCid = 'QmTestCid123';
      mockClient.object.stat.mockResolvedValue({
        CumulativeSize: 1024,
      });

      // Mock pin.ls to return pinned status
      mockClient.pin.ls.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { cid: { toString: () => testCid } };
        },
      });

      const metadata = await adapter.getMetadata(testCid);

      expect(metadata).toMatchObject({
        cid: testCid,
        size: 1024,
        pinned: true,
      });
      expect(metadata.created).toBeInstanceOf(Date);
    });

    it('should return unpinned status when content is not pinned', async () => {
      const testCid = 'QmTestCid123';
      mockClient.object.stat.mockResolvedValue({
        CumulativeSize: 1024,
      });

      // Mock empty pin list
      mockClient.pin.ls.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // No pins
        },
      });

      const metadata = await adapter.getMetadata(testCid);

      expect(metadata.pinned).toBe(false);
    });

    it('should throw error when stat fails', async () => {
      const testCid = 'QmTestCid123';
      mockClient.object.stat.mockRejectedValue(new Error('Not found'));

      await expect(adapter.getMetadata(testCid)).rejects.toThrow('IPFS metadata failed: Not found');
    });
  });

  describe('pin', () => {
    it('should pin content successfully', async () => {
      const testCid = 'QmTestCid123';
      mockClient.pin.add.mockResolvedValue({});

      await adapter.pin(testCid);

      expect(mockClient.pin.add).toHaveBeenCalledWith(testCid);
    });

    it('should throw error when pin fails', async () => {
      const testCid = 'QmTestCid123';
      mockClient.pin.add.mockRejectedValue(new Error('Pin failed'));

      await expect(adapter.pin(testCid)).rejects.toThrow('IPFS pin failed: Pin failed');
    });
  });

  describe('unpin', () => {
    it('should unpin content successfully', async () => {
      const testCid = 'QmTestCid123';
      mockClient.pin.rm.mockResolvedValue({});

      await adapter.unpin(testCid);

      expect(mockClient.pin.rm).toHaveBeenCalledWith(testCid);
    });

    it('should throw error when unpin fails', async () => {
      const testCid = 'QmTestCid123';
      mockClient.pin.rm.mockRejectedValue(new Error('Unpin failed'));

      await expect(adapter.unpin(testCid)).rejects.toThrow('IPFS unpin failed: Unpin failed');
    });
  });

  describe('getGatewayUrl', () => {
    it('should return correct gateway URL', () => {
      const testCid = 'QmTestCid123';
      const url = adapter.getGatewayUrl(testCid);

      expect(url).toBe('http://localhost:8080/ipfs/QmTestCid123');
    });
  });
});