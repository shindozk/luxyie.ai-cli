/**
 * Tests for formatting functions
 */

import { 
  truncate, 
  formatBytes, 
  formatDate, 
  formatRelativeTime, 
  pluralize, 
  formatDuration,
  wrapText 
} from '../src/utils/format.js';

describe('Format Utilities', () => {
  describe('truncate', () => {
    it('should truncate long text', () => {
      expect(truncate('This is a very long text', 10)).toBe('This is...');
    });

    it('should keep short text', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes to KB', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });

    it('should format bytes to MB', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('should format bytes to GB', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });
  });

  describe('formatDate', () => {
    it('should format dates', () => {
      const date = new Date('2024-06-15');
      const result = formatDate(date);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return relative time', () => {
      const past = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = formatRelativeTime(past);
      expect(result).toContain('hours');
    });
  });

  describe('pluralize', () => {
    it('should return singular for count 1', () => {
      expect(pluralize(1, 'item')).toBe('1 item');
    });

    it('should return plural for count > 1', () => {
      expect(pluralize(2, 'item')).toBe('2 items');
    });

    it('should support custom plural form', () => {
      expect(pluralize(2, 'person', 'people')).toBe('2 people');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(1000)).toContain('1.0s');
    });

    it('should handle large durations', () => {
      const result = formatDuration(2 * 60 * 60 * 1000); // 2 hours
      expect(result).toMatch(/h|m/);
    });
  });

  describe('wrapText', () => {
    it('should wrap text at specified width', () => {
      const text = 'This is a long line of text that needs wrapping';
      const result = wrapText(text, 20);
      expect(result.length).toBeGreaterThan(1);
    });

    it('should handle short text without wrapping', () => {
      const text = 'Short';
      const result = wrapText(text, 20);
      expect(result).toEqual(['Short']);
    });
  });
});
