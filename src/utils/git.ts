import { execSync } from 'child_process';
import path from 'path';

export function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (error) {
    return 'none';
  }
}

export function formatPathForPrompt(fullPath: string): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (fullPath.startsWith(homeDir)) {
    return '~' + fullPath.slice(homeDir.length).replace(/\\/g, '/');
  }
  return fullPath.replace(/\\/g, '/');
}