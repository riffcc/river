import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import axios from 'axios';
import { TAMSClient } from './client';
import { IPFSAdapter } from '../storage/ipfs-adapter';
import { Flow, FlowSegment, Source, TimeRange } from '../models/types';
import { TimestampUtils } from '../models/timestamp';

// Mock axios
vi.mock('axios');

// Mock IPFSAdapter
vi.mock('../storage/ipfs-adapter');

describe('TAMSClient', () => {
  let client: TAMSClient;
  let mockAxiosInstance: any;
  let mockIPFSAdapter: IPFSAdapter;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    (axios.create as Mock).mockReturnValue(mockAxiosInstance);

    // Create mock IPFS adapter
    mockIPFSAdapter = new IPFSAdapter('http://localhost:5001', 'http://localhost:8080');
    
    // Mock IPFS methods
    (mockIPFSAdapter.store as Mock) = vi.fn();
    (mockIPFSAdapter.retrieve as Mock) = vi.fn();

    // Create client
    client = new TAMSClient({
      apiUrl: 'http://localhost:4010',
      authToken: 'test-token',
      ipfsAdapter: mockIPFSAdapter,
    });
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:4010',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });
    });

    it('should set up interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Flow Operations', () => {
    describe('createFlow', () => {
      it('should create a flow', async () => {
        const flow: Partial<Flow> = {
          id: 'flow-123',
          label: 'Test Flow',
          format: { type: 'video' },
        };

        mockAxiosInstance.put.mockResolvedValue({ data: flow });

        const result = await client.createFlow(flow);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/flows/flow-123', flow);
        expect(result).toEqual(flow);
      });
    });

    describe('getFlow', () => {
      it('should get a flow by ID', async () => {
        const flow = { id: 'flow-123', label: 'Test Flow' };
        mockAxiosInstance.get.mockResolvedValue({ data: flow });

        const result = await client.getFlow('flow-123');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/flows/flow-123');
        expect(result).toEqual(flow);
      });
    });

    describe('listFlows', () => {
      it('should list flows with filters', async () => {
        const flows = [{ id: 'flow-1' }, { id: 'flow-2' }];
        mockAxiosInstance.get.mockResolvedValue({ data: flows });

        const result = await client.listFlows({ 
          sourceId: 'source-123',
          label: 'test',
          limit: 10 
        });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/flows', {
          params: { sourceId: 'source-123', label: 'test', limit: 10 },
        });
        expect(result).toEqual(flows);
      });
    });

    describe('updateFlow', () => {
      it('should update a flow', async () => {
        const updates = { label: 'Updated Label' };
        const updatedFlow = { id: 'flow-123', label: 'Updated Label' };
        mockAxiosInstance.patch.mockResolvedValue({ data: updatedFlow });

        const result = await client.updateFlow('flow-123', updates);

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/flows/flow-123', updates);
        expect(result).toEqual(updatedFlow);
      });
    });

    describe('deleteFlow', () => {
      it('should delete a flow', async () => {
        mockAxiosInstance.delete.mockResolvedValue({ status: 204 });

        await client.deleteFlow('flow-123');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/flows/flow-123');
      });
    });
  });

  describe('Flow Segment Operations', () => {
    describe('createSegment', () => {
      it('should create a segment', async () => {
        const segment: FlowSegment = {
          id: 'seg-123',
          flowId: 'flow-123',
          timerange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(10, 0),
          },
          objectIds: ['QmCid123'],
          created: new Date(),
          updated: new Date(),
        };

        const apiResponse = {
          id: 'seg-123',
          flow_id: 'flow-123',
          timerange: '0:0...10:0',
          object_ids: ['QmCid123'],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };

        mockAxiosInstance.post.mockResolvedValue({ data: apiResponse });

        const result = await client.createSegment(segment);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/flows/flow-123/segments',
          expect.objectContaining({
            id: 'seg-123',
            timerange: '0:0...10:0',
            object_ids: ['QmCid123'],
          })
        );
        expect(result.id).toBe('seg-123');
        expect(result.flowId).toBe('flow-123');
      });
    });

    describe('createSegmentsBulk', () => {
      it('should create multiple segments', async () => {
        const segments: FlowSegment[] = [
          {
            id: 'seg-1',
            flowId: 'flow-123',
            timerange: {
              start: TimestampUtils.create(0, 0),
              end: TimestampUtils.create(10, 0),
            },
            objectIds: ['QmCid1'],
            created: new Date(),
            updated: new Date(),
          },
          {
            id: 'seg-2',
            flowId: 'flow-123',
            timerange: {
              start: TimestampUtils.create(10, 0),
              end: TimestampUtils.create(20, 0),
            },
            objectIds: ['QmCid2'],
            created: new Date(),
            updated: new Date(),
          },
        ];

        const apiResponse = {
          success: [
            {
              id: 'seg-1',
              flow_id: 'flow-123',
              timerange: '0:0...10:0',
              object_ids: ['QmCid1'],
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          ],
          failed: [
            {
              segment: { id: 'seg-2' },
              error: 'Validation error',
            },
          ],
        };

        mockAxiosInstance.post.mockResolvedValue({ data: apiResponse });

        const result = await client.createSegmentsBulk('flow-123', segments);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/flows/flow-123/segments/bulk',
          {
            segments: expect.arrayContaining([
              expect.objectContaining({ id: 'seg-1', timerange: '0:0...10:0' }),
              expect.objectContaining({ id: 'seg-2', timerange: '10:0...20:0' }),
            ]),
          }
        );
        expect(result.success).toHaveLength(1);
        expect(result.failed).toHaveLength(1);
      });
    });

    describe('getSegments', () => {
      it('should get segments with timerange filter', async () => {
        const timerange: TimeRange = {
          start: TimestampUtils.create(5, 0),
          end: TimestampUtils.create(15, 0),
        };

        const apiResponse = [
          {
            id: 'seg-1',
            flow_id: 'flow-123',
            timerange: '0:0...10:0',
            object_ids: ['QmCid1'],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
          {
            id: 'seg-2',
            flow_id: 'flow-123',
            timerange: '10:0...20:0',
            object_ids: ['QmCid2'],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: apiResponse });

        const result = await client.getSegments('flow-123', timerange, { limit: 10 });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/flows/flow-123/segments',
          {
            params: {
              timerange: '5:0...15:0',
              limit: 10,
            },
          }
        );
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('seg-1');
      });
    });
  });

  describe('Storage Operations with IPFS', () => {
    describe('requestStorage', () => {
      it('should request storage URLs', async () => {
        const request = {
          flowId: 'flow-123',
          segmentCount: 5,
          segmentDuration: 1_000_000_000, // 1 second
        };

        const apiResponse = {
          urls: ['http://example.com/upload1', 'http://example.com/upload2'],
          object_ids: ['obj-1', 'obj-2'],
          expires: new Date(Date.now() + 3600000).toISOString(),
        };

        mockAxiosInstance.post.mockResolvedValue({ data: apiResponse });

        const result = await client.requestStorage(request);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/flows/flow-123/storage',
          {
            segment_count: 5,
            segment_duration: 1_000_000_000,
          }
        );
        expect(result.urls).toHaveLength(2);
        expect(result.objectIds).toEqual(['obj-1', 'obj-2']);
        expect(result.expires).toBeInstanceOf(Date);
      });
    });

    describe('uploadMediaToIPFS', () => {
      it('should upload media to IPFS', async () => {
        const data = Buffer.from('test media data');
        const cid = 'QmTestCid123';

        (mockIPFSAdapter.store as Mock).mockResolvedValue(cid);

        const result = await client.uploadMediaToIPFS(data, { pin: true });

        expect(mockIPFSAdapter.store).toHaveBeenCalledWith(data, { pin: true });
        expect(result).toBe(cid);
      });
    });

    describe('downloadMediaFromIPFS', () => {
      it('should download media from IPFS', async () => {
        const cid = 'QmTestCid123';
        const data = Buffer.from('test media data');

        (mockIPFSAdapter.retrieve as Mock).mockResolvedValue(data);

        const result = await client.downloadMediaFromIPFS(cid);

        expect(mockIPFSAdapter.retrieve).toHaveBeenCalledWith(cid);
        expect(result).toEqual(data);
      });
    });
  });

  describe('Source Operations', () => {
    describe('createSource', () => {
      it('should create a source', async () => {
        const source: Partial<Source> = {
          id: 'source-123',
          label: 'Test Source',
          flows: [{ flowId: 'flow-123', role: 'main' }],
        };

        mockAxiosInstance.put.mockResolvedValue({ data: source });

        const result = await client.createSource(source);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/sources/source-123', source);
        expect(result).toEqual(source);
      });
    });

    describe('getSource', () => {
      it('should get a source by ID', async () => {
        const source = { id: 'source-123', label: 'Test Source' };
        mockAxiosInstance.get.mockResolvedValue({ data: source });

        const result = await client.getSource('source-123');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/sources/source-123');
        expect(result).toEqual(source);
      });
    });
  });

  describe('High-level workflow methods', () => {
    describe('uploadAndCreateSegment', () => {
      it('should upload media and create segment', async () => {
        const mediaData = Buffer.from('test video data');
        const cid = 'QmVideoCid123';
        const timerange: TimeRange = {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        };

        (mockIPFSAdapter.store as Mock).mockResolvedValue(cid);
        
        const apiResponse = {
          id: 'seg-123',
          flow_id: 'flow-123',
          timerange: '0:0...10:0',
          object_ids: [cid],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };

        mockAxiosInstance.post.mockResolvedValue({ data: apiResponse });

        const result = await client.uploadAndCreateSegment(
          'flow-123',
          mediaData,
          timerange,
          { pin: true }
        );

        expect(mockIPFSAdapter.store).toHaveBeenCalledWith(mediaData, { pin: true });
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/flows/flow-123/segments',
          expect.objectContaining({
            timerange: '0:0...10:0',
            object_ids: [cid],
          })
        );
        expect(result.objectIds).toContain(cid);
      });
    });

    describe('getMediaForTimerange', () => {
      it('should get media data for timerange', async () => {
        const timerange: TimeRange = {
          start: TimestampUtils.create(5, 0),
          end: TimestampUtils.create(15, 0),
        };

        const segments = [
          {
            id: 'seg-1',
            flow_id: 'flow-123',
            timerange: '0:0...10:0',
            object_ids: ['QmCid1'],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
          {
            id: 'seg-2',
            flow_id: 'flow-123',
            timerange: '10:0...20:0',
            object_ids: ['QmCid2'],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: segments });
        
        const data1 = Buffer.from('data1');
        const data2 = Buffer.from('data2');
        (mockIPFSAdapter.retrieve as Mock)
          .mockResolvedValueOnce(data1)
          .mockResolvedValueOnce(data2);

        const result = await client.getMediaForTimerange('flow-123', timerange);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/flows/flow-123/segments',
          { params: { timerange: '5:0...15:0' } }
        );
        expect(mockIPFSAdapter.retrieve).toHaveBeenCalledWith('QmCid1');
        expect(mockIPFSAdapter.retrieve).toHaveBeenCalledWith('QmCid2');
        expect(result).toHaveLength(2);
        expect(result[0].data).toEqual(data1);
        expect(result[1].data).toEqual(data2);
      });

      it('should throw error for segments without media', async () => {
        const timerange: TimeRange = {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        };

        const segments = [
          {
            id: 'seg-1',
            flow_id: 'flow-123',
            timerange: '0:0...10:0',
            object_ids: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: segments });

        await expect(
          client.getMediaForTimerange('flow-123', timerange)
        ).rejects.toThrow('Segment seg-1 has no media objects');
      });
    });
  });
});