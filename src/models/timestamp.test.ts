import { describe, it, expect } from 'vitest';
import { TimestampUtils } from './timestamp';
import { Timestamp, TimeRange } from './types';

describe('TimestampUtils', () => {
  describe('create', () => {
    it('should create a normalized timestamp', () => {
      const ts = TimestampUtils.create(10, 1_500_000_000);
      expect(ts).toEqual({ seconds: 11, nanoseconds: 500_000_000 });
    });

    it('should handle zero nanoseconds', () => {
      const ts = TimestampUtils.create(10);
      expect(ts).toEqual({ seconds: 10, nanoseconds: 0 });
    });

    it('should handle negative normalization', () => {
      const ts = TimestampUtils.create(10, 2_500_000_000);
      expect(ts).toEqual({ seconds: 12, nanoseconds: 500_000_000 });
    });
  });

  describe('fromMilliseconds', () => {
    it('should convert milliseconds to timestamp', () => {
      const ts = TimestampUtils.fromMilliseconds(1500);
      expect(ts).toEqual({ seconds: 1, nanoseconds: 500_000_000 });
    });

    it('should handle zero milliseconds', () => {
      const ts = TimestampUtils.fromMilliseconds(0);
      expect(ts).toEqual({ seconds: 0, nanoseconds: 0 });
    });

    it('should handle large values', () => {
      const ts = TimestampUtils.fromMilliseconds(1_234_567_890);
      expect(ts).toEqual({ seconds: 1_234_567, nanoseconds: 890_000_000 });
    });
  });

  describe('toMilliseconds', () => {
    it('should convert timestamp to milliseconds', () => {
      const ts: Timestamp = { seconds: 1, nanoseconds: 500_000_000 };
      expect(TimestampUtils.toMilliseconds(ts)).toBe(1500);
    });

    it('should truncate sub-millisecond precision', () => {
      const ts: Timestamp = { seconds: 1, nanoseconds: 500_999_999 };
      expect(TimestampUtils.toMilliseconds(ts)).toBe(1500);
    });
  });

  describe('toString and fromString', () => {
    it('should convert timestamp to string and back', () => {
      const original: Timestamp = { seconds: 123, nanoseconds: 456_789_000 };
      const str = TimestampUtils.toString(original);
      expect(str).toBe('123:456789000');
      
      const parsed = TimestampUtils.fromString(str);
      expect(parsed).toEqual(original);
    });

    it('should handle zero values', () => {
      const ts: Timestamp = { seconds: 0, nanoseconds: 0 };
      expect(TimestampUtils.toString(ts)).toBe('0:0');
    });

    it('should throw on invalid string format', () => {
      expect(() => TimestampUtils.fromString('invalid')).toThrow('Invalid timestamp string');
      expect(() => TimestampUtils.fromString('123:abc')).toThrow('Invalid timestamp string');
    });
  });

  describe('add', () => {
    it('should add two timestamps', () => {
      const a: Timestamp = { seconds: 10, nanoseconds: 500_000_000 };
      const b: Timestamp = { seconds: 5, nanoseconds: 300_000_000 };
      const result = TimestampUtils.add(a, b);
      expect(result).toEqual({ seconds: 15, nanoseconds: 800_000_000 });
    });

    it('should handle nanosecond overflow', () => {
      const a: Timestamp = { seconds: 10, nanoseconds: 800_000_000 };
      const b: Timestamp = { seconds: 5, nanoseconds: 500_000_000 };
      const result = TimestampUtils.add(a, b);
      expect(result).toEqual({ seconds: 16, nanoseconds: 300_000_000 });
    });
  });

  describe('subtract', () => {
    it('should subtract two timestamps', () => {
      const a: Timestamp = { seconds: 15, nanoseconds: 800_000_000 };
      const b: Timestamp = { seconds: 5, nanoseconds: 300_000_000 };
      const result = TimestampUtils.subtract(a, b);
      expect(result).toEqual({ seconds: 10, nanoseconds: 500_000_000 });
    });

    it('should handle nanosecond underflow', () => {
      const a: Timestamp = { seconds: 15, nanoseconds: 300_000_000 };
      const b: Timestamp = { seconds: 5, nanoseconds: 800_000_000 };
      const result = TimestampUtils.subtract(a, b);
      expect(result).toEqual({ seconds: 9, nanoseconds: 500_000_000 });
    });
  });

  describe('compare', () => {
    it('should compare timestamps correctly', () => {
      const a: Timestamp = { seconds: 10, nanoseconds: 500_000_000 };
      const b: Timestamp = { seconds: 10, nanoseconds: 500_000_000 };
      const c: Timestamp = { seconds: 11, nanoseconds: 0 };
      const d: Timestamp = { seconds: 10, nanoseconds: 300_000_000 };

      expect(TimestampUtils.compare(a, b)).toBe(0); // equal
      expect(TimestampUtils.compare(a, c)).toBe(-1); // a < c
      expect(TimestampUtils.compare(c, a)).toBe(1); // c > a
      expect(TimestampUtils.compare(a, d)).toBe(1); // a > d (same seconds, different nanos)
    });
  });

  describe('isWithinRange', () => {
    it('should check if timestamp is within range', () => {
      const range: TimeRange = {
        start: { seconds: 10, nanoseconds: 0 },
        end: { seconds: 20, nanoseconds: 0 },
      };

      expect(TimestampUtils.isWithinRange({ seconds: 15, nanoseconds: 0 }, range)).toBe(true);
      expect(TimestampUtils.isWithinRange({ seconds: 10, nanoseconds: 0 }, range)).toBe(true); // inclusive start
      expect(TimestampUtils.isWithinRange({ seconds: 20, nanoseconds: 0 }, range)).toBe(false); // exclusive end
      expect(TimestampUtils.isWithinRange({ seconds: 5, nanoseconds: 0 }, range)).toBe(false);
      expect(TimestampUtils.isWithinRange({ seconds: 25, nanoseconds: 0 }, range)).toBe(false);
    });
  });

  describe('duration', () => {
    it('should calculate duration of a timerange', () => {
      const range: TimeRange = {
        start: { seconds: 10, nanoseconds: 500_000_000 },
        end: { seconds: 15, nanoseconds: 800_000_000 },
      };
      const duration = TimestampUtils.duration(range);
      expect(duration).toEqual({ seconds: 5, nanoseconds: 300_000_000 });
    });
  });

  describe('timeRangeToString and timeRangeFromString', () => {
    it('should convert timerange to string and back', () => {
      const range: TimeRange = {
        start: { seconds: 10, nanoseconds: 500_000_000 },
        end: { seconds: 15, nanoseconds: 800_000_000 },
      };
      
      const str = TimestampUtils.timeRangeToString(range);
      expect(str).toBe('10:500000000...15:800000000');
      
      const parsed = TimestampUtils.timeRangeFromString(str);
      expect(parsed).toEqual(range);
    });

    it('should throw on invalid timerange string', () => {
      expect(() => TimestampUtils.timeRangeFromString('invalid')).toThrow('Invalid timerange string');
      expect(() => TimestampUtils.timeRangeFromString('10:0..20:0')).toThrow('Invalid timerange string');
    });
  });

  describe('now', () => {
    it('should return current timestamp', () => {
      const before = Date.now();
      const ts = TimestampUtils.now();
      const after = Date.now();
      
      const tsMs = TimestampUtils.toMilliseconds(ts);
      expect(tsMs).toBeGreaterThanOrEqual(before);
      expect(tsMs).toBeLessThanOrEqual(after);
    });
  });

  describe('nowTAI', () => {
    it('should return TAI timestamp (37 seconds ahead of UTC)', () => {
      const utc = TimestampUtils.now();
      const tai = TimestampUtils.nowTAI();
      
      const diff = TimestampUtils.subtract(tai, utc);
      expect(diff.seconds).toBe(37);
      expect(diff.nanoseconds).toBe(0);
    });
  });
});