import { v4 as uuidv4 } from 'uuid';
import { Flow, FlowFormat, FlowSegment, TimeRange, Timestamp } from './types';
import { TimestampUtils } from './timestamp';

export class FlowModel implements Flow {
  id: string;
  sourceId?: string;
  label?: string;
  description?: string;
  format: FlowFormat;
  tags: Record<string, string>;
  created: Date;
  updated: Date;
  generation: number;
  segments: FlowSegment[];

  constructor(data: Partial<Flow> = {}) {
    this.id = data.id || uuidv4();
    this.sourceId = data.sourceId;
    this.label = data.label;
    this.description = data.description;
    this.format = data.format || { type: 'video' };
    this.tags = data.tags || {};
    this.created = data.created || new Date();
    this.updated = data.updated || new Date();
    this.generation = data.generation || 0;
    this.segments = data.segments || [];
  }

  /**
   * Add a segment to the flow
   */
  addSegment(segment: Omit<FlowSegment, 'flowId' | 'created' | 'updated'>): FlowSegment {
    const newSegment: FlowSegment = {
      ...segment,
      flowId: this.id,
      created: new Date(),
      updated: new Date(),
    };

    // Validate segment doesn't overlap with existing segments
    this.validateSegmentTimeRange(newSegment.timerange);

    this.segments.push(newSegment);
    this.segments.sort((a, b) => 
      TimestampUtils.compare(a.timerange.start, b.timerange.start)
    );
    
    this.updated = new Date();
    this.generation++;

    return newSegment;
  }

  /**
   * Get segments that cover a specific timerange
   */
  getSegmentsInRange(range: TimeRange): FlowSegment[] {
    return this.segments.filter(segment => {
      // Check if segment overlaps with requested range
      const segmentStart = segment.timerange.start;
      const segmentEnd = segment.timerange.end;
      const rangeStart = range.start;
      const rangeEnd = range.end;

      return TimestampUtils.compare(segmentStart, rangeEnd) < 0 &&
             TimestampUtils.compare(segmentEnd, rangeStart) > 0;
    });
  }

  /**
   * Get segment at a specific timestamp
   */
  getSegmentAtTimestamp(timestamp: Timestamp): FlowSegment | undefined {
    return this.segments.find(segment => 
      TimestampUtils.isWithinRange(timestamp, segment.timerange)
    );
  }

  /**
   * Calculate total duration of the flow
   */
  getTotalDuration(): Timestamp | null {
    if (this.segments.length === 0) return null;

    const firstSegment = this.segments[0];
    const lastSegment = this.segments[this.segments.length - 1];

    return TimestampUtils.subtract(
      lastSegment.timerange.end,
      firstSegment.timerange.start
    );
  }

  /**
   * Check if the flow has continuous coverage (no gaps)
   */
  hasContinuousCoverage(): boolean {
    if (this.segments.length <= 1) return true;

    for (let i = 1; i < this.segments.length; i++) {
      const prevEnd = this.segments[i - 1].timerange.end;
      const currStart = this.segments[i].timerange.start;
      
      if (TimestampUtils.compare(prevEnd, currStart) !== 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get gaps in the flow timeline
   */
  getGaps(): TimeRange[] {
    const gaps: TimeRange[] = [];

    for (let i = 1; i < this.segments.length; i++) {
      const prevEnd = this.segments[i - 1].timerange.end;
      const currStart = this.segments[i].timerange.start;
      
      if (TimestampUtils.compare(prevEnd, currStart) < 0) {
        gaps.push({
          start: prevEnd,
          end: currStart,
        });
      }
    }

    return gaps;
  }

  /**
   * Clone the flow with a new ID (for copy-on-write operations)
   */
  clone(newId?: string): FlowModel {
    const cloneId = newId || uuidv4();
    return new FlowModel({
      ...this,
      id: cloneId,
      created: new Date(),
      updated: new Date(),
      generation: 0,
      segments: this.segments.map(segment => ({
        ...segment,
        id: uuidv4(),
        flowId: cloneId,
        created: new Date(),
        updated: new Date(),
      })),
    });
  }

  /**
   * Create a new flow with segments from a specific timerange
   */
  extractRange(range: TimeRange, newId?: string): FlowModel {
    const newFlow = new FlowModel({
      ...this,
      id: newId || uuidv4(),
      created: new Date(),
      updated: new Date(),
      generation: 0,
      segments: [],
    });

    const relevantSegments = this.getSegmentsInRange(range);

    for (const segment of relevantSegments) {
      // Calculate intersection of segment with requested range
      const start = TimestampUtils.compare(segment.timerange.start, range.start) > 0
        ? segment.timerange.start
        : range.start;
      
      const end = TimestampUtils.compare(segment.timerange.end, range.end) < 0
        ? segment.timerange.end
        : range.end;

      // If segment needs to be trimmed, adjust media timerange accordingly
      let mediaTimerange = segment.mediaTimerange;
      if (mediaTimerange && (
        TimestampUtils.compare(start, segment.timerange.start) !== 0 ||
        TimestampUtils.compare(end, segment.timerange.end) !== 0
      )) {
        // Calculate offset into the segment
        const startOffset = TimestampUtils.subtract(start, segment.timerange.start);
        const duration = TimestampUtils.subtract(end, start);
        
        const newMediaStart = TimestampUtils.add(mediaTimerange.start, startOffset);
        mediaTimerange = {
          start: newMediaStart,
          end: TimestampUtils.add(newMediaStart, duration),
        };
      }

      newFlow.addSegment({
        id: uuidv4(),
        timerange: { start, end },
        objectIds: segment.objectIds,
        tsOffset: segment.tsOffset,
        duration: segment.duration,
        mediaTimerange,
      });
    }

    return newFlow;
  }

  /**
   * Validate that a timerange doesn't overlap with existing segments
   */
  private validateSegmentTimeRange(range: TimeRange): void {
    for (const segment of this.segments) {
      const overlaps = 
        TimestampUtils.compare(range.start, segment.timerange.end) < 0 &&
        TimestampUtils.compare(range.end, segment.timerange.start) > 0;
      
      if (overlaps) {
        throw new Error(
          `Segment timerange ${TimestampUtils.timeRangeToString(range)} ` +
          `overlaps with existing segment ${TimestampUtils.timeRangeToString(segment.timerange)}`
        );
      }
    }
  }

  /**
   * Convert to plain object
   */
  toJSON(): Flow {
    return {
      id: this.id,
      sourceId: this.sourceId,
      label: this.label,
      description: this.description,
      format: this.format,
      tags: this.tags,
      created: this.created,
      updated: this.updated,
      generation: this.generation,
      segments: this.segments,
    };
  }
}