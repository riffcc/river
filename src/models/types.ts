/**
 * Core types for TAMS integration
 */

export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface TimeRange {
  start: Timestamp;
  end: Timestamp;
}

export interface FlowSegment {
  id: string;
  flowId: string;
  timerange: TimeRange;
  objectIds: string[]; // IPFS CIDs
  tsOffset?: Timestamp;
  duration?: Timestamp;
  mediaTimerange?: TimeRange;
  created: Date;
  updated: Date;
}

export interface Flow {
  id: string;
  sourceId?: string;
  label?: string;
  description?: string;
  format: FlowFormat;
  tags: Record<string, string>;
  created: Date;
  updated: Date;
  generation: number;
  segments?: FlowSegment[];
}

export interface FlowFormat {
  type: 'video' | 'audio' | 'data';
  mediaType?: string;
  codec?: string;
  frameRate?: Rational;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  width?: number;
  height?: number;
  interlaceMode?: 'progressive' | 'interlaced_tff' | 'interlaced_bff';
  colorspace?: string;
  transferCharacteristic?: string;
}

export interface Rational {
  numerator: number;
  denominator: number;
}

export interface Source {
  id: string;
  label?: string;
  description?: string;
  tags: Record<string, string>;
  flows: FlowReference[];
  created: Date;
  updated: Date;
}

export interface FlowReference {
  flowId: string;
  role?: string; // e.g., 'main', 'proxy', 'thumbnail'
}

export interface StorageRequest {
  flowId: string;
  segmentCount: number;
  segmentDuration: number; // in nanoseconds
}

export interface StorageResponse {
  urls: string[];
  objectIds?: string[];
  expires: Date;
}