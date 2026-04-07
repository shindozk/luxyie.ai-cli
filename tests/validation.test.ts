/**
 * Tests for validation functions
 */

import { 
  isValidFilePath, 
  isValidSessionId, 
  isCommand, 
  sanitizeInput,
  hasCodeBlocks,
  parseCommand
} from '../src/utils/validation.js';

describe('Validation Functions', () => {
  describe('isValidFilePath', () => {
    it('should reject null bytes', () => {
      expect(isValidFilePath('path\0with\0null')).toBe(false);
    });

    it('should accept normal paths', () => {
      expect(isValidFilePath('/usr/local/bin')).toBe(true);
      expect(isValidFilePath('./relative/path')).toBe(true);
    });

    it('should reject very long paths', () => {
      const longPath = 'a'.repeat(10000);
      expect(isValidFilePath(longPath)).toBe(false);
    });
  });

  describe('isValidSessionId', () => {
    it('should reject non-UUID strings', () => {
      expect(isValidSessionId('not-a-uuid')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidSessionId('')).toBe(false);
    });
  });

  describe('isCommand', () => {
    it('should detect strings starting with /', () => {
      expect(isCommand('/quit')).toBe(true);
      expect(isCommand('/help')).toBe(true);
    });

    it('should reject strings not starting with /', () => {
      expect(isCommand('quit')).toBe(false);
      expect(isCommand('help me')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove control characters', () => {
      const input = 'hello\x00world\x01test';
      const result = sanitizeInput(input);
      expect(result).toBe('helloworldtest');
    });

    it('should keep normal text intact', () => {
      const input = 'Normal text with spaces';
      expect(sanitizeInput(input)).toBe('Normal text with spaces');
    });
  });

  describe('hasCodeBlocks', () => {
    it('should detect code blocks', () => {
      expect(hasCodeBlocks('```typescript\nconsole.log("hi")\n```')).toBe(true);
    });

    it('should return false for normal text', () => {
      expect(hasCodeBlocks('This is normal text')).toBe(false);
    });
  });

  describe('parseCommand', () => {
    it('should parse command and arguments', () => {
      const result = parseCommand('/config show');
      expect(result.command).toBe('/config');
      expect(result.args).toEqual(['show']);
    });

    it('should handle command without args', () => {
      const result = parseCommand('/quit');
      expect(result.command).toBe('/quit');
      expect(result.args).toEqual([]);
    });
  });
});
