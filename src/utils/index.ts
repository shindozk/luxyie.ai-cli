/**
 * Utils Index
 * Re-exports all utility modules for easy importing
 */

// Abort handling
export {
  createAbortHandler,
  createSimpleAbortHandler,
  isAbortError,
  handleAbortError,
  type AbortHandlerOptions,
  type AbortHandlerResult,
} from './abort-handler.js';

// Paste detection
export {
  detectPastedText,
  getContentStats,
  truncateForDisplay,
  sanitizeInput,
  isEmptyInput,
  isCommand,
  type PasteInfo,
} from './paste-detector.js';

// Session management
export {
  createSessionTimer,
  estimateTokens,
  formatDuration,
  getSessionSummary,
  type SessionInfo,
  type SessionTimer,
  type SessionStats,
} from './session-manager.js';

// Tool execution
export {
  parseToolArgs,
  getToolApproval,
  executeToolCall,
  executeToolCalls,
  formatToolMessage,
  type ToolCall,
  type ToolExecutionResult,
  type ToolApprovalOptions,
  type ApprovalAction,
} from './tool-executor.js';

// Stream processing
export {
  StreamAccumulator,
  createStreamAccumulator,
  parseSSELine,
  processSSEData,
  type StreamChunk,
  type StreamResult,
  type StreamCallbacks,
  type ToolCallDelta,
} from './stream-processor.js';

// Message formatting
export {
  formatUserMessage,
  formatAIMessage,
  formatSystemMessage,
  formatErrorMessage,
  formatSeparator,
  formatToolStatus,
  formatSecurityPrompt,
  type MessageFormatOptions,
} from './message-formatter.js';

// Re-export formatReasoning from renderer
export { formatReasoning } from '../ui/renderer.js';

// Re-export colors and input prompt from components for compatibility
export { colors, createInputPrompt, createStatusBar, createWelcomeMessage, createSessionInfoDisplay } from '../ui/components.js';

// Legacy re-exports for compatibility
export {
  truncate,
  formatBytes,
  formatDate,
  formatRelativeTime,
  pluralize,
  formatDuration as formatDurationUtil,
  wrapText,
} from './format.js';

export {
  isValidFilePath,
  isValidSessionId,
  isCommand as isCommandUtil,
  sanitizeInput as sanitizeInputUtil,
  hasCodeBlocks,
  parseCommand,
} from './validation.js';

export {
  truncate as truncateHelper,
  formatDate as formatDateHelper,
  formatMessage,
  formatBox,
} from './ui-helpers.js';
