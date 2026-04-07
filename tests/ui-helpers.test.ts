/**
 * Basic tests for UI helper functions
 */

import { truncate, formatDate, formatMessage, formatBox } from '../src/utils/ui-helpers.js';

describe('UI Helper Functions', () => {
  describe('truncate', () => {
    it('should not truncate strings shorter than max length', () => {
      expect(truncate('short', 10)).toBe('short');
    });

    it('should truncate strings longer than max length', () => {
      expect(truncate('this is a long string', 10)).toBe('this is...');
    });

    it('should handle exact length strings', () => {
      expect(truncate('exactly10', 10)).toBe('exactly10');
    });

    it('should handle empty strings', () => {
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('formatDate', () => {
    it('should format a valid date', () => {
      const date = new Date('2024-01-01T12:00:00');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should handle current date', () => {
      const formatted = formatDate(new Date());
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('formatMessage', () => {
    it('should format user messages', () => {
      const result = formatMessage('user', 'Hello');
      expect(result).toBe('You: Hello');
    });

    it('should format assistant messages', () => {
      const result = formatMessage('assistant', 'Hi there');
      expect(result).toBe('Luxyie: Hi there');
    });

    it('should format system messages', () => {
      const result = formatMessage('system', 'System message');
      expect(result).toBe('System: System message');
    });

    it('should support custom names', () => {
      const result = formatMessage('user', 'Hello', { userName: 'CustomUser' });
      expect(result).toBe('CustomUser: Hello');
    });
  });

  describe('formatBox', () => {
    it('should create a box around content', () => {
      const result = formatBox('Title', 'Content');
      expect(result).toContain('Title');
      expect(result).toContain('Content');
      expect(result).toContain('┌');
      expect(result).toContain('┘');
    });

    it('should handle multi-line content', () => {
      const result = formatBox('Title', 'Line 1\nLine 2');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });
});
