import axios, { AxiosInstance } from 'axios';
import { 
  Flow, 
  FlowSegment, 
  Source, 
  StorageRequest, 
  StorageResponse,
  TimeRange 
} from '../models/types';
import { TimestampUtils } from '../models/timestamp';
import { IPFSAdapter } from '../storage/ipfs-adapter';
import { logger } from '../utils/logger';

export interface TAMSClientConfig {
  apiUrl: string;
  authToken?: string;
  ipfsAdapter: IPFSAdapter;
  timeout?: number;
}

export class TAMSClient {
  private axios: AxiosInstance;
  private ipfs: IPFSAdapter;

  constructor(config: TAMSClientConfig) {
    this.axios = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.authToken && { 'Authorization': `Bearer ${config.authToken}` }),
      },
    });

    this.ipfs = config.ipfsAdapter;

    // Add request/response interceptors for logging
    this.axios.interceptors.request.use(
      (config) => {
        logger.debug('TAMS API Request', { 
          method: config.method, 
          url: config.url,
          data: config.data 
        });
        return config;
      },
      (error) => {
        logger.error('TAMS API Request Error', error);
        return Promise.reject(error);
      }
    );

    this.axios.interceptors.response.use(
      (response) => {
        logger.debug('TAMS API Response', { 
          status: response.status,
          url: response.config.url 
        });
        return response;
      },
      (error) => {
        logger.error('TAMS API Response Error', { 
          status: error.response?.status,
          data: error.response?.data 
        });
        return Promise.reject(error);
      }
    );
  }

  // Flow Operations

  async createFlow(flow: Partial<Flow>): Promise<Flow> {
    const response = await this.axios.put(`/flows/${flow.id}`, flow);
    return response.data;
  }

  async getFlow(flowId: string): Promise<Flow> {
    const response = await this.axios.get(`/flows/${flowId}`);
    return response.data;
  }

  async listFlows(params?: { 
    sourceId?: string; 
    label?: string; 
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<Flow[]> {
    const response = await this.axios.get('/flows', { params });
    return response.data;
  }

  async updateFlow(flowId: string, updates: Partial<Flow>): Promise<Flow> {
    const response = await this.axios.patch(`/flows/${flowId}`, updates);
    return response.data;
  }

  async deleteFlow(flowId: string): Promise<void> {
    await this.axios.delete(`/flows/${flowId}`);
  }

  // Flow Segment Operations

  async createSegment(segment: FlowSegment): Promise<FlowSegment> {
    const response = await this.axios.post(
      `/flows/${segment.flowId}/segments`, 
      this.segmentToAPI(segment)
    );
    return this.segmentFromAPI(response.data);
  }

  async createSegmentsBulk(flowId: string, segments: FlowSegment[]): Promise<{
    success: FlowSegment[];
    failed: Array<{ segment: FlowSegment; error: string }>;
  }> {
    const response = await this.axios.post(
      `/flows/${flowId}/segments/bulk`,
      { segments: segments.map(s => this.segmentToAPI(s)) }
    );
    
    return {
      success: response.data.success.map((s: any) => this.segmentFromAPI(s)),
      failed: response.data.failed || [],
    };
  }

  async getSegments(
    flowId: string, 
    timerange?: TimeRange,
    params?: { limit?: number; offset?: number }
  ): Promise<FlowSegment[]> {
    const queryParams = {
      ...params,
      ...(timerange && { 
        timerange: TimestampUtils.timeRangeToString(timerange) 
      }),
    };

    const response = await this.axios.get(
      `/flows/${flowId}/segments`,
      { params: queryParams }
    );
    
    return response.data.map((s: any) => this.segmentFromAPI(s));
  }

  // Storage Operations with IPFS

  async requestStorage(request: StorageRequest): Promise<StorageResponse> {
    // For IPFS, we generate CIDs for the segments
    const objectIds: string[] = [];
    
    // Request storage URLs from TAMS (even though we'll use IPFS)
    const response = await this.axios.post(
      `/flows/${request.flowId}/storage`,
      {
        segment_count: request.segmentCount,
        segment_duration: request.segmentDuration,
      }
    );

    // If TAMS provides object IDs, use them; otherwise generate our own
    if (response.data.object_ids) {
      objectIds.push(...response.data.object_ids);
    }

    return {
      urls: response.data.urls || [],
      objectIds: objectIds.length > 0 ? objectIds : undefined,
      expires: new Date(response.data.expires),
    };
  }

  async uploadMediaToIPFS(data: Buffer, options?: { pin?: boolean }): Promise<string> {
    return this.ipfs.store(data, options);
  }

  async downloadMediaFromIPFS(cid: string): Promise<Buffer> {
    return this.ipfs.retrieve(cid);
  }

  // Source Operations

  async createSource(source: Partial<Source>): Promise<Source> {
    const response = await this.axios.put(`/sources/${source.id}`, source);
    return response.data;
  }

  async getSource(sourceId: string): Promise<Source> {
    const response = await this.axios.get(`/sources/${sourceId}`);
    return response.data;
  }

  async listSources(params?: {
    label?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<Source[]> {
    const response = await this.axios.get('/sources', { params });
    return response.data;
  }

  async updateSource(sourceId: string, updates: Partial<Source>): Promise<Source> {
    const response = await this.axios.patch(`/sources/${sourceId}`, updates);
    return response.data;
  }

  // Helper methods

  private segmentToAPI(segment: FlowSegment): any {
    return {
      id: segment.id,
      timerange: TimestampUtils.timeRangeToString(segment.timerange),
      object_ids: segment.objectIds,
      ts_offset: segment.tsOffset ? TimestampUtils.toString(segment.tsOffset) : undefined,
      duration: segment.duration ? TimestampUtils.toString(segment.duration) : undefined,
      media_timerange: segment.mediaTimerange 
        ? TimestampUtils.timeRangeToString(segment.mediaTimerange) 
        : undefined,
    };
  }

  private segmentFromAPI(data: any): FlowSegment {
    return {
      id: data.id,
      flowId: data.flow_id,
      timerange: TimestampUtils.timeRangeFromString(data.timerange),
      objectIds: data.object_ids || [],
      tsOffset: data.ts_offset ? TimestampUtils.fromString(data.ts_offset) : undefined,
      duration: data.duration ? TimestampUtils.fromString(data.duration) : undefined,
      mediaTimerange: data.media_timerange 
        ? TimestampUtils.timeRangeFromString(data.media_timerange)
        : undefined,
      created: new Date(data.created),
      updated: new Date(data.updated),
    };
  }

  // High-level workflow methods

  /**
   * Upload media content and create flow segments
   */
  async uploadAndCreateSegment(
    flowId: string,
    mediaData: Buffer,
    timerange: TimeRange,
    options?: {
      pin?: boolean;
      mediaTimerange?: TimeRange;
      tsOffset?: TimeRange;
    }
  ): Promise<FlowSegment> {
    // Upload to IPFS
    const cid = await this.uploadMediaToIPFS(mediaData, { pin: options?.pin });
    
    // Create segment
    const segment: FlowSegment = {
      id: `seg-${Date.now()}`,
      flowId,
      timerange,
      objectIds: [cid],
      mediaTimerange: options?.mediaTimerange,
      tsOffset: options?.tsOffset,
      created: new Date(),
      updated: new Date(),
    };

    return this.createSegment(segment);
  }

  /**
   * Get media content for a specific timerange
   */
  async getMediaForTimerange(
    flowId: string,
    timerange: TimeRange
  ): Promise<Array<{ segment: FlowSegment; data: Buffer }>> {
    // Get segments in range
    const segments = await this.getSegments(flowId, timerange);
    
    // Download media for each segment
    const results = await Promise.all(
      segments.map(async (segment) => {
        if (segment.objectIds.length === 0) {
          throw new Error(`Segment ${segment.id} has no media objects`);
        }
        
        // Download from first available CID
        const data = await this.downloadMediaFromIPFS(segment.objectIds[0]);
        return { segment, data };
      })
    );

    return results;
  }
}