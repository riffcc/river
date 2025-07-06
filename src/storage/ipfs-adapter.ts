import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { StorageAdapter, StoreOptions, ContentMetadata } from './interfaces';
import { logger } from '../utils/logger';

export class IPFSAdapter implements StorageAdapter {
  private client: IPFSHTTPClient;
  private gatewayUrl: string;

  constructor(apiUrl: string, gatewayUrl: string) {
    this.client = create({ url: apiUrl });
    this.gatewayUrl = gatewayUrl;
    logger.info('IPFS adapter initialized', { apiUrl, gatewayUrl });
  }

  async store(data: Buffer | Uint8Array, options: StoreOptions = {}): Promise<string> {
    try {
      const { pin = true, onlyHash = false, timeout = 30000 } = options;
      
      const addOptions = {
        pin,
        onlyHash,
        timeout,
      };

      const result = await this.client.add(data, addOptions);
      const cid = result.cid.toString();
      
      logger.debug('Content stored in IPFS', { cid, size: data.length, pinned: pin });
      return cid;
    } catch (error) {
      logger.error('Failed to store content in IPFS', error);
      throw new Error(`IPFS store failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retrieve(cid: string): Promise<Buffer> {
    try {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      logger.debug('Content retrieved from IPFS', { cid, size: buffer.length });
      
      return buffer;
    } catch (error) {
      logger.error('Failed to retrieve content from IPFS', { cid, error });
      throw new Error(`IPFS retrieve failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(cid: string): Promise<boolean> {
    try {
      // Try to get object stats
      await this.client.object.stat(cid, { timeout: 5000 });
      return true;
    } catch (error) {
      // If error is not found, return false
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getMetadata(cid: string): Promise<ContentMetadata> {
    try {
      const stat = await this.client.object.stat(cid);
      const pinned = await this.isPinned(cid);
      
      return {
        cid,
        size: stat.CumulativeSize,
        created: new Date(), // IPFS doesn't store creation date
        pinned,
      };
    } catch (error) {
      logger.error('Failed to get metadata from IPFS', { cid, error });
      throw new Error(`IPFS metadata failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async pin(cid: string): Promise<void> {
    try {
      await this.client.pin.add(cid);
      logger.debug('Content pinned in IPFS', { cid });
    } catch (error) {
      logger.error('Failed to pin content in IPFS', { cid, error });
      throw new Error(`IPFS pin failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async unpin(cid: string): Promise<void> {
    try {
      await this.client.pin.rm(cid);
      logger.debug('Content unpinned in IPFS', { cid });
    } catch (error) {
      logger.error('Failed to unpin content in IPFS', { cid, error });
      throw new Error(`IPFS unpin failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async isPinned(cid: string): Promise<boolean> {
    try {
      const pins = this.client.pin.ls({ paths: [cid] });
      
      for await (const pin of pins) {
        if (pin.cid.toString() === cid) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      // If error occurs, assume not pinned
      return false;
    }
  }

  /**
   * Get a public gateway URL for the content
   */
  getGatewayUrl(cid: string): string {
    return `${this.gatewayUrl}/ipfs/${cid}`;
  }
}