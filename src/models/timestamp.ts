import { Timestamp, TimeRange } from './types';

export class TimestampUtils {
  static readonly NANOSECONDS_PER_SECOND = 1_000_000_000;

  /**
   * Create a timestamp from seconds and nanoseconds
   */
  static create(seconds: number, nanoseconds: number = 0): Timestamp {
    // Normalize nanoseconds
    const extraSeconds = Math.floor(nanoseconds / this.NANOSECONDS_PER_SECOND);
    return {
      seconds: seconds + extraSeconds,
      nanoseconds: nanoseconds % this.NANOSECONDS_PER_SECOND,
    };
  }

  /**
   * Create a timestamp from milliseconds
   */
  static fromMilliseconds(ms: number): Timestamp {
    const seconds = Math.floor(ms / 1000);
    const nanoseconds = (ms % 1000) * 1_000_000;
    return this.create(seconds, nanoseconds);
  }

  /**
   * Convert timestamp to milliseconds
   */
  static toMilliseconds(ts: Timestamp): number {
    return ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1_000_000);
  }

  /**
   * Convert timestamp to string format "seconds:nanoseconds"
   */
  static toString(ts: Timestamp): string {
    return `${ts.seconds}:${ts.nanoseconds}`;
  }

  /**
   * Parse timestamp from string format "seconds:nanoseconds"
   */
  static fromString(str: string): Timestamp {
    const [seconds, nanoseconds] = str.split(':').map(Number);
    if (isNaN(seconds) || isNaN(nanoseconds)) {
      throw new Error(`Invalid timestamp string: ${str}`);
    }
    return this.create(seconds, nanoseconds);
  }

  /**
   * Add two timestamps
   */
  static add(a: Timestamp, b: Timestamp): Timestamp {
    return this.create(
      a.seconds + b.seconds,
      a.nanoseconds + b.nanoseconds
    );
  }

  /**
   * Subtract timestamp b from a
   */
  static subtract(a: Timestamp, b: Timestamp): Timestamp {
    let seconds = a.seconds - b.seconds;
    let nanoseconds = a.nanoseconds - b.nanoseconds;
    
    if (nanoseconds < 0) {
      seconds -= 1;
      nanoseconds += this.NANOSECONDS_PER_SECOND;
    }
    
    return { seconds, nanoseconds };
  }

  /**
   * Compare two timestamps
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  static compare(a: Timestamp, b: Timestamp): number {
    if (a.seconds < b.seconds) return -1;
    if (a.seconds > b.seconds) return 1;
    if (a.nanoseconds < b.nanoseconds) return -1;
    if (a.nanoseconds > b.nanoseconds) return 1;
    return 0;
  }

  /**
   * Check if timestamp is within a timerange
   */
  static isWithinRange(ts: Timestamp, range: TimeRange): boolean {
    return this.compare(ts, range.start) >= 0 && this.compare(ts, range.end) < 0;
  }

  /**
   * Calculate duration of a timerange
   */
  static duration(range: TimeRange): Timestamp {
    return this.subtract(range.end, range.start);
  }

  /**
   * Create a timerange string in format "start...end"
   */
  static timeRangeToString(range: TimeRange): string {
    return `${this.toString(range.start)}...${this.toString(range.end)}`;
  }

  /**
   * Parse timerange from string format "start...end"
   */
  static timeRangeFromString(str: string): TimeRange {
    const parts = str.split('...');
    if (parts.length !== 2) {
      throw new Error(`Invalid timerange string: ${str}`);
    }
    return {
      start: this.fromString(parts[0]),
      end: this.fromString(parts[1]),
    };
  }

  /**
   * Get current timestamp (Unix epoch)
   */
  static now(): Timestamp {
    const now = Date.now();
    return this.fromMilliseconds(now);
  }

  /**
   * Get TAI timestamp (International Atomic Time)
   * Note: This is a simplified version. Real TAI conversion requires leap second data.
   */
  static nowTAI(): Timestamp {
    // TAI is currently 37 seconds ahead of UTC (as of 2023)
    const TAI_OFFSET_SECONDS = 37;
    const now = this.now();
    return this.add(now, this.create(TAI_OFFSET_SECONDS, 0));
  }
}