import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimelineManager } from './timeline';
import { Timeline, Track, Clip } from './types';
import { TimestampUtils } from '../models/timestamp';

describe('TimelineManager', () => {
  let timeline: Timeline;
  let manager: TimelineManager;

  beforeEach(() => {
    timeline = {
      id: 'timeline-1',
      projectId: 'project-1',
      duration: TimestampUtils.create(0, 0),
      tracks: [],
      markers: [],
      created: new Date(),
      updated: new Date(),
    };
    
    manager = new TimelineManager(timeline);
  });

  describe('Track operations', () => {
    describe('addTrack', () => {
      it('should add a new track', () => {
        const track = manager.addTrack({
          name: 'Video 1',
          type: 'video',
          index: 0,
          muted: false,
          locked: false,
          visible: true,
        });

        expect(track.id).toBeTruthy();
        expect(track.name).toBe('Video 1');
        expect(track.clips).toEqual([]);
        expect(manager.getTracks()).toHaveLength(1);
      });

      it('should insert track at correct index', () => {
        manager.addTrack({ name: 'Track 1', type: 'video', index: 0, muted: false, locked: false, visible: true });
        manager.addTrack({ name: 'Track 2', type: 'video', index: 1, muted: false, locked: false, visible: true });
        
        const track3 = manager.addTrack({ 
          name: 'Track 3', 
          type: 'audio', 
          index: 1, 
          muted: false, 
          locked: false, 
          visible: true 
        });

        const tracks = manager.getTracks();
        expect(tracks[1].id).toBe(track3.id);
        expect(tracks[0].index).toBe(0);
        expect(tracks[1].index).toBe(1);
        expect(tracks[2].index).toBe(2);
      });

      it('should emit track:added event', () => {
        const handler = vi.fn();
        manager.on('track:added', handler);

        const track = manager.addTrack({
          name: 'Track 1',
          type: 'video',
          index: 0,
          muted: false,
          locked: false,
          visible: true,
        });

        expect(handler).toHaveBeenCalledWith(track);
      });
    });

    describe('removeTrack', () => {
      let track1: Track;
      let track2: Track;

      beforeEach(() => {
        track1 = manager.addTrack({ name: 'Track 1', type: 'video', index: 0, muted: false, locked: false, visible: true });
        track2 = manager.addTrack({ name: 'Track 2', type: 'audio', index: 1, muted: false, locked: false, visible: true });
      });

      it('should remove track', () => {
        const result = manager.removeTrack(track1.id);
        
        expect(result).toBe(true);
        expect(manager.getTracks()).toHaveLength(1);
        expect(manager.getTrack(track1.id)).toBeUndefined();
      });

      it('should update track indices after removal', () => {
        manager.removeTrack(track1.id);
        
        const tracks = manager.getTracks();
        expect(tracks[0].index).toBe(0);
      });

      it('should return false for non-existent track', () => {
        const result = manager.removeTrack('non-existent');
        expect(result).toBe(false);
      });

      it('should emit track:removed event', () => {
        const handler = vi.fn();
        manager.on('track:removed', handler);

        manager.removeTrack(track1.id);
        expect(handler).toHaveBeenCalledWith(track1);
      });
    });

    describe('reorderTracks', () => {
      beforeEach(() => {
        manager.addTrack({ name: 'Track 1', type: 'video', index: 0, muted: false, locked: false, visible: true });
        manager.addTrack({ name: 'Track 2', type: 'audio', index: 1, muted: false, locked: false, visible: true });
        manager.addTrack({ name: 'Track 3', type: 'video', index: 2, muted: false, locked: false, visible: true });
      });

      it('should reorder tracks', () => {
        manager.reorderTracks(0, 2);
        
        const tracks = manager.getTracks();
        expect(tracks[0].name).toBe('Track 2');
        expect(tracks[1].name).toBe('Track 3');
        expect(tracks[2].name).toBe('Track 1');
        
        // Check indices are updated
        expect(tracks[0].index).toBe(0);
        expect(tracks[1].index).toBe(1);
        expect(tracks[2].index).toBe(2);
      });

      it('should emit tracks:reordered event', () => {
        const handler = vi.fn();
        manager.on('tracks:reordered', handler);

        manager.reorderTracks(0, 2);
        expect(handler).toHaveBeenCalledWith({ fromIndex: 0, toIndex: 2 });
      });
    });
  });

  describe('Clip operations', () => {
    let videoTrack: Track;
    let audioTrack: Track;

    beforeEach(() => {
      videoTrack = manager.addTrack({ 
        name: 'Video 1', 
        type: 'video', 
        index: 0, 
        muted: false, 
        locked: false, 
        visible: true 
      });
      
      audioTrack = manager.addTrack({ 
        name: 'Audio 1', 
        type: 'audio', 
        index: 1, 
        muted: false, 
        locked: false, 
        visible: true 
      });
    });

    describe('addClip', () => {
      it('should add clip to track', () => {
        const clip = manager.addClip(videoTrack.id, {
          sourceId: 'source-1',
          flowId: 'flow-1',
          timelineRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(5, 0),
          },
          sourceRange: {
            start: TimestampUtils.create(10, 0),
            end: TimestampUtils.create(15, 0),
          },
          speed: 1.0,
          effects: [],
        });

        expect(clip).toBeTruthy();
        expect(clip!.id).toBeTruthy();
        expect(clip!.trackId).toBe(videoTrack.id);
        expect(videoTrack.clips).toHaveLength(1);
      });

      it('should insert clips in sorted order', () => {
        const clip1 = manager.addClip(videoTrack.id, {
          sourceId: 'source-1',
          flowId: 'flow-1',
          timelineRange: {
            start: TimestampUtils.create(5, 0),
            end: TimestampUtils.create(10, 0),
          },
          sourceRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(5, 0),
          },
          speed: 1.0,
          effects: [],
        });

        const clip2 = manager.addClip(videoTrack.id, {
          sourceId: 'source-2',
          flowId: 'flow-2',
          timelineRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(5, 0),
          },
          sourceRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(5, 0),
          },
          speed: 1.0,
          effects: [],
        });

        expect(videoTrack.clips[0].id).toBe(clip2!.id);
        expect(videoTrack.clips[1].id).toBe(clip1!.id);
      });

      it('should throw error for overlapping clips', () => {
        manager.addClip(videoTrack.id, {
          sourceId: 'source-1',
          flowId: 'flow-1',
          timelineRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(5, 0),
          },
          sourceRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(5, 0),
          },
          speed: 1.0,
          effects: [],
        });

        expect(() => {
          manager.addClip(videoTrack.id, {
            sourceId: 'source-2',
            flowId: 'flow-2',
            timelineRange: {
              start: TimestampUtils.create(3, 0),
              end: TimestampUtils.create(8, 0),
            },
            sourceRange: {
              start: TimestampUtils.create(0, 0),
              end: TimestampUtils.create(5, 0),
            },
            speed: 1.0,
            effects: [],
          });
        }).toThrow('Clip overlaps with existing clips');
      });

      it('should update timeline duration', () => {
        manager.addClip(videoTrack.id, {
          sourceId: 'source-1',
          flowId: 'flow-1',
          timelineRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(10, 0),
          },
          sourceRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(10, 0),
          },
          speed: 1.0,
          effects: [],
        });

        expect(manager.getDuration()).toEqual(TimestampUtils.create(10, 0));
      });
    });

    describe('moveClip', () => {
      let clip: Clip;

      beforeEach(() => {
        clip = manager.addClip(videoTrack.id, {
          sourceId: 'source-1',
          flowId: 'flow-1',
          timelineRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(5, 0),
          },
          sourceRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(5, 0),
          },
          speed: 1.0,
          effects: [],
        })!;
      });

      it('should move clip to different track', () => {
        const result = manager.moveClip(
          clip.id,
          audioTrack.id,
          TimestampUtils.create(10, 0)
        );

        expect(result).toBe(true);
        expect(videoTrack.clips).toHaveLength(0);
        expect(audioTrack.clips).toHaveLength(1);
        expect(audioTrack.clips[0].id).toBe(clip.id);
        expect(audioTrack.clips[0].timelineRange.start).toEqual(TimestampUtils.create(10, 0));
      });

      it('should move clip on same track', () => {
        const result = manager.moveClip(
          clip.id,
          videoTrack.id,
          TimestampUtils.create(10, 0)
        );

        expect(result).toBe(true);
        expect(videoTrack.clips).toHaveLength(1);
        expect(clip.timelineRange.start).toEqual(TimestampUtils.create(10, 0));
        expect(clip.timelineRange.end).toEqual(TimestampUtils.create(15, 0));
      });

      it('should throw error for overlapping move', () => {
        manager.addClip(audioTrack.id, {
          sourceId: 'source-2',
          flowId: 'flow-2',
          timelineRange: {
            start: TimestampUtils.create(8, 0),
            end: TimestampUtils.create(12, 0),
          },
          sourceRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(4, 0),
          },
          speed: 1.0,
          effects: [],
        });

        expect(() => {
          manager.moveClip(clip.id, audioTrack.id, TimestampUtils.create(10, 0));
        }).toThrow('Cannot move clip: overlaps with existing clips');
      });
    });

    describe('splitClip', () => {
      let clip: Clip;

      beforeEach(() => {
        clip = manager.addClip(videoTrack.id, {
          sourceId: 'source-1',
          flowId: 'flow-1',
          timelineRange: {
            start: TimestampUtils.create(0, 0),
            end: TimestampUtils.create(10, 0),
          },
          sourceRange: {
            start: TimestampUtils.create(5, 0),
            end: TimestampUtils.create(15, 0),
          },
          speed: 1.0,
          effects: [],
          transitions: {
            in: { id: 'trans-in', type: 'fade', duration: TimestampUtils.create(1, 0) },
            out: { id: 'trans-out', type: 'fade', duration: TimestampUtils.create(1, 0) },
          },
        })!;
      });

      it('should split clip at given point', () => {
        const splitPoint = TimestampUtils.create(4, 0);
        const result = manager.splitClip(clip.id, splitPoint);

        expect(result).toBeTruthy();
        expect(result).toHaveLength(2);
        expect(videoTrack.clips).toHaveLength(2);

        const [first, second] = result!;
        
        // Check timeline ranges
        expect(first.timelineRange.start).toEqual(TimestampUtils.create(0, 0));
        expect(first.timelineRange.end).toEqual(splitPoint);
        expect(second.timelineRange.start).toEqual(splitPoint);
        expect(second.timelineRange.end).toEqual(TimestampUtils.create(10, 0));

        // Check source ranges
        expect(first.sourceRange.start).toEqual(TimestampUtils.create(5, 0));
        expect(first.sourceRange.end).toEqual(TimestampUtils.create(9, 0));
        expect(second.sourceRange.start).toEqual(TimestampUtils.create(9, 0));
        expect(second.sourceRange.end).toEqual(TimestampUtils.create(15, 0));

        // Check transitions
        expect(first.transitions?.in).toEqual(clip.transitions?.in);
        expect(first.transitions?.out).toBeUndefined();
        expect(second.transitions?.in).toBeUndefined();
        expect(second.transitions?.out).toEqual(clip.transitions?.out);
      });

      it('should throw error for split point outside clip', () => {
        expect(() => {
          manager.splitClip(clip.id, TimestampUtils.create(15, 0));
        }).toThrow('Split point must be within clip timeline range');
      });
    });
  });

  describe('Timeline state', () => {
    it('should update playhead', () => {
      const handler = vi.fn();
      manager.on('playhead:changed', handler);

      const newPosition = TimestampUtils.create(5, 500_000_000);
      manager.setPlayhead(newPosition);

      expect(manager.getState().playhead).toEqual(newPosition);
      expect(handler).toHaveBeenCalledWith(newPosition);
    });

    it('should update selection', () => {
      const handler = vi.fn();
      manager.on('selection:changed', handler);

      const selection = [
        { clipId: 'clip-1', trackId: 'track-1' },
        { clipId: 'clip-2', trackId: 'track-2' },
      ];
      
      manager.setSelection(selection);

      expect(manager.getState().selection).toEqual(selection);
      expect(handler).toHaveBeenCalledWith(selection);
    });

    it('should update zoom level', () => {
      const handler = vi.fn();
      manager.on('zoom:changed', handler);

      manager.setZoomLevel(200);
      expect(manager.getState().zoomLevel).toBe(200);
      expect(handler).toHaveBeenCalledWith(200);

      // Test clamping
      manager.setZoomLevel(5);
      expect(manager.getState().zoomLevel).toBe(10);

      manager.setZoomLevel(2000);
      expect(manager.getState().zoomLevel).toBe(1000);
    });
  });

  describe('Markers', () => {
    it('should add marker', () => {
      const handler = vi.fn();
      manager.on('marker:added', handler);

      const marker = manager.addMarker({
        timestamp: TimestampUtils.create(5, 0),
        type: 'chapter',
        label: 'Chapter 1',
        description: 'First chapter',
      });

      expect(marker.id).toBeTruthy();
      expect(timeline.markers).toHaveLength(1);
      expect(handler).toHaveBeenCalledWith(marker);
    });

    it('should add markers in sorted order', () => {
      manager.addMarker({
        timestamp: TimestampUtils.create(10, 0),
        type: 'chapter',
        label: 'Chapter 2',
      });

      manager.addMarker({
        timestamp: TimestampUtils.create(5, 0),
        type: 'chapter',
        label: 'Chapter 1',
      });

      expect(timeline.markers[0].label).toBe('Chapter 1');
      expect(timeline.markers[1].label).toBe('Chapter 2');
    });

    it('should remove marker', () => {
      const marker = manager.addMarker({
        timestamp: TimestampUtils.create(5, 0),
        type: 'comment',
        label: 'Note',
      });

      const handler = vi.fn();
      manager.on('marker:removed', handler);

      const result = manager.removeMarker(marker.id);

      expect(result).toBe(true);
      expect(timeline.markers).toHaveLength(0);
      expect(handler).toHaveBeenCalledWith(marker);
    });
  });

  describe('Undo/Redo', () => {
    let track: Track;

    beforeEach(() => {
      track = manager.addTrack({
        name: 'Track 1',
        type: 'video',
        index: 0,
        muted: false,
        locked: false,
        visible: true,
      });
    });

    it('should track undo/redo state', () => {
      expect(manager.canUndo()).toBe(true); // Added track
      expect(manager.canRedo()).toBe(false);

      manager.undo();
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(true);

      manager.redo();
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });

    it('should emit undo/redo events', () => {
      const undoHandler = vi.fn();
      const redoHandler = vi.fn();
      
      manager.on('undo', undoHandler);
      manager.on('redo', redoHandler);

      manager.undo();
      expect(undoHandler).toHaveBeenCalled();

      manager.redo();
      expect(redoHandler).toHaveBeenCalled();
    });

    it('should limit history size', () => {
      // Add many operations
      for (let i = 0; i < 150; i++) {
        manager.addMarker({
          timestamp: TimestampUtils.create(i, 0),
          type: 'comment',
          label: `Marker ${i}`,
        });
      }

      // History should be limited to maxHistorySize (100)
      let undoCount = 0;
      while (manager.canUndo() && undoCount < 200) {
        manager.undo();
        undoCount++;
      }

      expect(undoCount).toBeLessThanOrEqual(100);
    });
  });
});