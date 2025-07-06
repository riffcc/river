export interface StorageAdapter {
  /**
   * Store data and return content identifier
   */
  store(data: Buffer | Uint8Array, options?: StoreOptions): Promise<string>;
  
  /**
   * Retrieve data by content identifier
   */
  retrieve(cid: string): Promise<Buffer>;
  
  /**
   * Check if content exists
   */
  exists(cid: string): Promise<boolean>;
  
  /**
   * Get metadata about stored content
   */
  getMetadata(cid: string): Promise<ContentMetadata>;
  
  /**
   * Pin content to prevent garbage collection
   */
  pin(cid: string): Promise<void>;
  
  /**
   * Unpin content
   */
  unpin(cid: string): Promise<void>;
}

export interface StoreOptions {
  pin?: boolean;
  onlyHash?: boolean;
  timeout?: number;
}

export interface ContentMetadata {
  cid: string;
  size: number;
  created: Date;
  pinned: boolean;
}

export interface StorageConfig {
  type: 'ipfs' | 's3';
  ipfs?: {
    apiUrl: string;
    gatewayUrl: string;
    timeout?: number;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}