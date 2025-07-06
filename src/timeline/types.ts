import { TimeRange, Timestamp } from '../models/types';

export interface Timeline {
  id: string;
  projectId: string;
  duration: Timestamp;
  tracks: Track[];
  markers: Marker[];
  created: Date;
  updated: Date;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle' | 'effect';
  index: number; // Order in timeline
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
  metadata?: TrackMetadata;
}

export interface TrackMetadata {
  height?: number; // For video tracks
  channels?: number; // For audio tracks
  effectType?: string; // For effect tracks
}

export interface Clip {
  id: string;
  sourceId: string; // Reference to TAMS Source
  flowId: string; // Reference to TAMS Flow
  trackId: string;
  timelineRange: TimeRange; // Position on timeline
  sourceRange: TimeRange; // In/out points from source
  speed: number; // Playback speed (1.0 = normal)
  transitions?: {
    in?: Transition;
    out?: Transition;
  };
  effects: Effect[];
  metadata?: ClipMetadata;
}

export interface ClipMetadata {
  label?: string;
  color?: string;
  notes?: string;
}

export interface Transition {
  id: string;
  type: 'cut' | 'dissolve' | 'wipe' | 'fade';
  duration: Timestamp;
  parameters?: Record<string, any>;
}

export interface Effect {
  id: string;
  type: string; // e.g., 'color_correction', 'blur', 'audio_eq'
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface Marker {
  id: string;
  timestamp: Timestamp;
  type: 'chapter' | 'comment' | 'todo' | 'sync';
  label: string;
  description?: string;
  color?: string;
  userId?: string; // Who created it
}

export interface EditCommand {
  id: string;
  type: EditCommandType;
  timestamp: Date;
  data: any;
  undoData?: any; // Data needed to undo this command
}

export type EditCommandType =
  | 'add_clip'
  | 'remove_clip'
  | 'move_clip'
  | 'trim_clip'
  | 'split_clip'
  | 'add_track'
  | 'remove_track'
  | 'reorder_tracks'
  | 'add_transition'
  | 'remove_transition'
  | 'add_effect'
  | 'remove_effect'
  | 'update_effect'
  | 'add_marker'
  | 'remove_marker';

export interface ClipSelection {
  clipId: string;
  trackId: string;
}

export interface TimelineState {
  playhead: Timestamp;
  selection: ClipSelection[];
  zoomLevel: number; // Pixels per second
  scrollPosition: number; // Horizontal scroll position
}