/**
 * Git Utilities
 * Provides git repository information and operations
 */

import { execSync, exec } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';

// ============================================================================
// TYPES
// ============================================================================

export interface GitStatus {
  branch: string;
  remote?: string;
  ahead?: number;
  behind?: number;
  staged: GitFileChange[];
  modified: GitFileChange[];
  untracked: string[];
  conflicts: string[];
}

export interface GitFileChange {
  status: string;
  path: string;
  originalPath?: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
}

// ============================================================================
// REPOSITORY INFO
// ============================================================================

/**
 * Check if current directory is a git repository
 */
export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe', cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current git branch
 */
export function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: 'pipe', cwd: process.cwd() }).trim();
  } catch {
    return 'none';
  }
}

/**
 * Get git remote URL
 */
export function getGitRemote(): string | null {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf-8', stdio: 'pipe', cwd: process.cwd() }).trim();
  } catch {
    return null;
  }
}

// ============================================================================
// STATUS
// ============================================================================

/**
 * Get comprehensive git status
 */
export function getGitStatus(): GitStatus | null {
  if (!isGitRepo()) return null;

  try {
    const branch = getGitBranch();
    const remote = getGitRemote();

    // Get ahead/behind counts
    let ahead = 0;
    let behind = 0;
    try {
      const countStr = execSync('git rev-list --left-right --count HEAD...@{upstream}', {
        encoding: 'utf-8',
        stdio: 'pipe',
        cwd: process.cwd(),
      }).trim();
      const [behindStr, aheadStr] = countStr.split('\t');
      ahead = parseInt(aheadStr || '0', 10);
      behind = parseInt(behindStr || '0', 10);
    } catch {
      // No upstream configured
    }

    // Get porcelain status
    const porcelain = execSync('git status --porcelain=v2', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    const status: GitStatus = {
      branch,
      staged: [],
      modified: [],
      untracked: [],
      conflicts: [],
    };

    // Add optional fields only if they have values
    if (remote) status.remote = remote;
    if (ahead) status.ahead = ahead;
    if (behind) status.behind = behind;

    for (const line of porcelain.split('\n')) {
      if (!line.trim()) continue;

      if (line.startsWith('1') || line.startsWith('2')) {
        const parts = line.split(' ');
        const x = parts[2] || ''; // Index status
        const y = parts[3] || ''; // Work tree status
        const filePath = line.startsWith('2') ? (parts[8] || '') : (parts[7] || '');

        if (x === 'U' || y === 'U') {
          if (filePath) status.conflicts.push(filePath);
        } else if (x !== '.' && x !== '?') {
          if (filePath) status.staged.push({ status: x, path: filePath });
        } else if (y !== '.' && y !== '?') {
          if (filePath) status.modified.push({ status: y, path: filePath });
        }
      } else if (line.startsWith('?')) {
        const filePath = line.substring(2);
        if (filePath) status.untracked.push(filePath);
      }
    }

    return status;
  } catch {
    return null;
  }
}

// ============================================================================
// DIFF
// ============================================================================

/**
 * Get unstaged changes diff (limited)
 */
export function getGitDiff(limit: number = 500): string | null {
  if (!isGitRepo()) return null;

  try {
    const diff = execSync('git diff HEAD --stat', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    }).trim();

    return diff.length > limit ? diff.substring(0, limit) + '...' : diff;
  } catch {
    return null;
  }
}

/**
 * Get detailed diff for a specific file
 */
export function getGitFileDiff(filePath: string): string | null {
  if (!isGitRepo()) return null;

  try {
    return execSync(`git diff HEAD -- "${filePath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    }).trim();
  } catch {
    return null;
  }
}

// ============================================================================
// LOG
// ============================================================================

/**
 * Get recent commits
 */
export function getGitLog(count: number = 10): GitCommit[] {
  if (!isGitRepo()) return [];

  try {
    const format = '%H|%h|%an|%ai|%s';
    const log = execSync(`git log -${count} --format="${format}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    return log
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, shortHash, author, date, message] = line.split('|');
        return {
          hash: hash || '',
          shortHash: shortHash || '',
          author: author || '',
          date: date || '',
          message: message || '',
        };
      });
  } catch {
    return [];
  }
}

// ============================================================================
// BRANCHES
// ============================================================================

/**
 * List all branches
 */
export function getGitBranches(): GitBranch[] {
  if (!isGitRepo()) return [];

  try {
    const output = execSync('git branch --list', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => ({
        name: line.replace(/^[\s*]+/, '').trim(),
        current: line.startsWith('*'),
      }));
  } catch {
    return [];
  }
}

// ============================================================================
// OPERATIONS
// ============================================================================

/**
 * Stage files
 */
export function gitAdd(files: string = '.'): { success: boolean; output: string } {
  try {
    const output = execSync(`git add ${files}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: error.message };
  }
}

/**
 * Create commit with message
 */
export function gitCommit(message: string): { success: boolean; output: string } {
  try {
    const output = execSync(`git commit -m "${message}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: error.message };
  }
}

/**
 * Generate AI-assisted commit message based on changes
 */
export async function generateCommitMessage(
  apiClient: any,
  status: GitStatus
): Promise<string> {
  const changes: string[] = [];

  for (const file of [...status.staged, ...status.modified]) {
    changes.push(`- ${file.status} ${file.path}`);
  }

  for (const file of status.untracked) {
    changes.push(`- ?? ${file}`);
  }

  const prompt = `Based on these git changes, generate a concise conventional commit message (type: description). 
Output ONLY the commit message, nothing else.

Changes:
${changes.join('\n')}

Types: feat, fix, docs, style, refactor, test, chore`;

  try {
    const response = await apiClient.sendMessage(
      [
        { role: 'system', content: 'You are a commit message generator. Output only the commit message.' },
        { role: 'user', content: prompt },
      ],
      {},
      false
    );

    return response?.content?.trim() || 'chore: update files';
  } catch {
    return 'chore: update files';
  }
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format git status for display
 */
export function formatGitStatus(status: GitStatus): string {
  const lines: string[] = [];

  lines.push(`Branch: ${status.branch}`);
  if (status.remote) {
    lines.push(`Remote: ${status.remote}`);
  }
  if (status.ahead) lines.push(`Ahead: ${status.ahead} commits`);
  if (status.behind) lines.push(`Behind: ${status.behind} commits`);
  lines.push('');

  if (status.staged.length > 0) {
    lines.push('Staged changes:');
    for (const file of status.staged) {
      lines.push(`  ${file.status} ${file.path}`);
    }
    lines.push('');
  }

  if (status.modified.length > 0) {
    lines.push('Modified (unstaged):');
    for (const file of status.modified) {
      lines.push(`  ${file.status} ${file.path}`);
    }
    lines.push('');
  }

  if (status.untracked.length > 0) {
    lines.push('Untracked files:');
    for (const file of status.untracked.slice(0, 10)) {
      lines.push(`  ?? ${file}`);
    }
    if (status.untracked.length > 10) {
      lines.push(`  ... and ${status.untracked.length - 10} more`);
    }
    lines.push('');
  }

  if (status.conflicts.length > 0) {
    lines.push('CONFLICTS:');
    for (const file of status.conflicts) {
      lines.push(`  UU ${file}`);
    }
    lines.push('');
  }

  const totalChanges = status.staged.length + status.modified.length + status.untracked.length;
  if (totalChanges === 0) {
    lines.push('  Nothing to commit, working tree clean');
  } else {
    lines.push(`  ${totalChanges} file(s) changed`);
  }

  return lines.join('\n');
}

/**
 * Format git log for display
 */
export function formatGitLog(commits: GitCommit[]): string {
  if (commits.length === 0) return '  No commits found.';

  const lines: string[] = [];

  for (const commit of commits) {
    lines.push(`${commit.shortHash} ${commit.message}`);
    lines.push(`  ${commit.author} · ${commit.date.split(' ').slice(0, 3).join(' ')}`);
    lines.push('');
  }

  return lines.join('\n');
}
