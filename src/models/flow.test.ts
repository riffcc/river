import { describe, it, expect, beforeEach } from 'vitest';
import { FlowModel } from './flow';
import { FlowSegment, TimeRange } from './types';
import { TimestampUtils } from './timestamp';

describe('FlowModel', () => {
  let flow: FlowModel;

  beforeEach(() => {
    flow = new FlowModel({
      label: 'Test Flow',
      format: { type: 'video', codec: 'h264' },
    });
  });

  describe('constructor', () => {
    it('should create flow with default values', () => {
      const newFlow = new FlowModel();
      expect(newFlow.id).toBeTruthy();
      expect(newFlow.format.type).toBe('video');
      expect(newFlow.tags).toEqual({});
      expect(newFlow.generation).toBe(0);
      expect(newFlow.segments).toEqual([]);
    });

    it('should create flow with provided values', () => {
      const data = {
        id: 'test-id',
        label: 'My Flow',
        format: { type: 'audio' as const, sampleRate: 48000 },
        tags: { project: 'test' },
      };
      const newFlow = new FlowModel(data);
      expect(newFlow.id).toBe('test-id');
      expect(newFlow.label).toBe('My Flow');
      expect(newFlow.format.type).toBe('audio');
      expect(newFlow.format.sampleRate).toBe(48000);
      expect(newFlow.tags).toEqual({ project: 'test' });
    });
  });

  describe('addSegment', () => {
    it('should add segment and sort by start time', () => {
      const segment1 = {
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(10, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid1'],
      };

      const segment2 = {
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid2'],
      };

      flow.addSegment(segment1);
      flow.addSegment(segment2);

      expect(flow.segments).toHaveLength(2);
      expect(flow.segments[0].id).toBe('seg2'); // Should be sorted
      expect(flow.segments[1].id).toBe('seg1');
      expect(flow.generation).toBe(2);
    });

    it('should throw error for overlapping segments', () => {
      const segment1 = {
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      };

      const overlapping = {
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(5, 0),
          end: TimestampUtils.create(15, 0),
        },
        objectIds: ['QmCid2'],
      };

      flow.addSegment(segment1);
      expect(() => flow.addSegment(overlapping)).toThrow(/overlaps with existing segment/);
    });

    it('should set flowId and timestamps on new segment', () => {
      const segment = {
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      };

      const added = flow.addSegment(segment);
      expect(added.flowId).toBe(flow.id);
      expect(added.created).toBeInstanceOf(Date);
      expect(added.updated).toBeInstanceOf(Date);
    });
  });

  describe('getSegmentsInRange', () => {
    beforeEach(() => {
      // Add test segments
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      });

      flow.addSegment({
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(10, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid2'],
      });

      flow.addSegment({
        id: 'seg3',
        timerange: {
          start: TimestampUtils.create(20, 0),
          end: TimestampUtils.create(30, 0),
        },
        objectIds: ['QmCid3'],
      });
    });

    it('should get segments within range', () => {
      const range: TimeRange = {
        start: TimestampUtils.create(5, 0),
        end: TimestampUtils.create(25, 0),
      };

      const segments = flow.getSegmentsInRange(range);
      expect(segments).toHaveLength(3);
      expect(segments.map(s => s.id)).toEqual(['seg1', 'seg2', 'seg3']);
    });

    it('should get segments that partially overlap', () => {
      const range: TimeRange = {
        start: TimestampUtils.create(15, 0),
        end: TimestampUtils.create(25, 0),
      };

      const segments = flow.getSegmentsInRange(range);
      expect(segments).toHaveLength(2);
      expect(segments.map(s => s.id)).toEqual(['seg2', 'seg3']);
    });

    it('should return empty array for range with no segments', () => {
      const range: TimeRange = {
        start: TimestampUtils.create(40, 0),
        end: TimestampUtils.create(50, 0),
      };

      const segments = flow.getSegmentsInRange(range);
      expect(segments).toHaveLength(0);
    });
  });

  describe('getSegmentAtTimestamp', () => {
    beforeEach(() => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      });

      flow.addSegment({
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(10, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid2'],
      });
    });

    it('should find segment at timestamp', () => {
      const segment = flow.getSegmentAtTimestamp(TimestampUtils.create(5, 0));
      expect(segment?.id).toBe('seg1');
    });

    it('should find segment at boundary', () => {
      const segment = flow.getSegmentAtTimestamp(TimestampUtils.create(10, 0));
      expect(segment?.id).toBe('seg2'); // Start is inclusive
    });

    it('should return undefined for timestamp outside segments', () => {
      const segment = flow.getSegmentAtTimestamp(TimestampUtils.create(25, 0));
      expect(segment).toBeUndefined();
    });
  });

  describe('getTotalDuration', () => {
    it('should return null for empty flow', () => {
      expect(flow.getTotalDuration()).toBeNull();
    });

    it('should calculate duration for continuous segments', () => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(10, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid1'],
      });

      flow.addSegment({
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(20, 0),
          end: TimestampUtils.create(35, 500_000_000),
        },
        objectIds: ['QmCid2'],
      });

      const duration = flow.getTotalDuration();
      expect(duration).toEqual({ seconds: 25, nanoseconds: 500_000_000 });
    });
  });

  describe('hasContinuousCoverage', () => {
    it('should return true for empty flow', () => {
      expect(flow.hasContinuousCoverage()).toBe(true);
    });

    it('should return true for single segment', () => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      });

      expect(flow.hasContinuousCoverage()).toBe(true);
    });

    it('should return true for continuous segments', () => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      });

      flow.addSegment({
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(10, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid2'],
      });

      expect(flow.hasContinuousCoverage()).toBe(true);
    });

    it('should return false for segments with gaps', () => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      });

      flow.addSegment({
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(15, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid2'],
      });

      expect(flow.hasContinuousCoverage()).toBe(false);
    });
  });

  describe('getGaps', () => {
    it('should return empty array for continuous segments', () => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      });

      flow.addSegment({
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(10, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid2'],
      });

      const gaps = flow.getGaps();
      expect(gaps).toHaveLength(0);
    });

    it('should find gaps between segments', () => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      });

      flow.addSegment({
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(15, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid2'],
      });

      flow.addSegment({
        id: 'seg3',
        timerange: {
          start: TimestampUtils.create(25, 0),
          end: TimestampUtils.create(30, 0),
        },
        objectIds: ['QmCid3'],
      });

      const gaps = flow.getGaps();
      expect(gaps).toHaveLength(2);
      expect(gaps[0]).toEqual({
        start: TimestampUtils.create(10, 0),
        end: TimestampUtils.create(15, 0),
      });
      expect(gaps[1]).toEqual({
        start: TimestampUtils.create(20, 0),
        end: TimestampUtils.create(25, 0),
      });
    });
  });

  describe('clone', () => {
    it('should create a deep copy with new IDs', () => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
      });

      const cloned = flow.clone();

      expect(cloned.id).not.toBe(flow.id);
      expect(cloned.label).toBe(flow.label);
      expect(cloned.format).toEqual(flow.format);
      expect(cloned.generation).toBe(0);
      expect(cloned.segments).toHaveLength(1);
      expect(cloned.segments[0].id).not.toBe(flow.segments[0].id);
      expect(cloned.segments[0].flowId).toBe(cloned.id);
      expect(cloned.segments[0].objectIds).toEqual(['QmCid1']);
    });
  });

  describe('extractRange', () => {
    beforeEach(() => {
      flow.addSegment({
        id: 'seg1',
        timerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
        objectIds: ['QmCid1'],
        mediaTimerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
      });

      flow.addSegment({
        id: 'seg2',
        timerange: {
          start: TimestampUtils.create(10, 0),
          end: TimestampUtils.create(20, 0),
        },
        objectIds: ['QmCid2'],
        mediaTimerange: {
          start: TimestampUtils.create(0, 0),
          end: TimestampUtils.create(10, 0),
        },
      });

      flow.addSegment({
        id: 'seg3',
        timerange: {
          start: TimestampUtils.create(20, 0),
          end: TimestampUtils.create(30, 0),
        },
        objectIds: ['QmCid3'],
      });
    });

    it('should extract complete segments within range', () => {
      const range: TimeRange = {
        start: TimestampUtils.create(10, 0),
        end: TimestampUtils.create(20, 0),
      };

      const extracted = flow.extractRange(range);
      expect(extracted.segments).toHaveLength(1);
      expect(extracted.segments[0].objectIds).toEqual(['QmCid2']);
      expect(extracted.segments[0].timerange).toEqual(range);
    });

    it('should trim segments at range boundaries', () => {
      const range: TimeRange = {
        start: TimestampUtils.create(5, 0),
        end: TimestampUtils.create(25, 0),
      };

      const extracted = flow.extractRange(range);
      expect(extracted.segments).toHaveLength(3);
      
      // First segment should be trimmed
      expect(extracted.segments[0].timerange).toEqual({
        start: TimestampUtils.create(5, 0),
        end: TimestampUtils.create(10, 0),
      });
      
      // Last segment should be trimmed
      expect(extracted.segments[2].timerange).toEqual({
        start: TimestampUtils.create(20, 0),
        end: TimestampUtils.create(25, 0),
      });
    });

    it('should adjust media timerange when trimming', () => {
      const range: TimeRange = {
        start: TimestampUtils.create(5, 0),
        end: TimestampUtils.create(15, 0),
      };

      const extracted = flow.extractRange(range);
      
      // First segment media timerange should be adjusted
      expect(extracted.segments[0].mediaTimerange).toEqual({
        start: TimestampUtils.create(5, 0),
        end: TimestampUtils.create(10, 0),
      });
      
      // Second segment media timerange should be adjusted
      expect(extracted.segments[1].mediaTimerange).toEqual({
        start: TimestampUtils.create(0, 0),
        end: TimestampUtils.create(5, 0),
      });
    });
  });
});