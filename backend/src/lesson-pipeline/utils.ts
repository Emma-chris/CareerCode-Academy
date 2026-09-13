import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

export const execAsync = promisify(exec);

export interface CliArgs {
  lesson?: string;
  course?: string;
  limit?: number;
  resume?: boolean;
  force?: boolean;
  auto?: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--lesson':
      case '--course':
        const val = argv[++i];
        if (a === '--lesson') args.lesson = val;
        else args.course = val;
        break;
      case '--limit':
        args.limit = parseInt(argv[++i], 10);
        break;
      case '--resume':
        args.resume = true;
        break;
      case '--force':
        args.force = true;
        break;
      case '--auto':
        args.auto = true;
        break;
    }
  }
  return args;
}

export async function run(command: string, opts: { cwd?: string; timeout?: number } = {}): Promise<string> {
  const { stdout } = await execAsync(command, {
    maxBuffer: 64 * 1024 * 1024,
    timeout: opts.timeout ?? 120000,
    cwd: opts.cwd,
    shell: 'cmd.exe',
  });
  return stdout;
}

// Resolve ffmpeg/ffprobe at call time so dotenv has already run.
export function ff(): string {
  return process.env.FFMPEG_BIN || 'ffmpeg';
}

export function ffprobe(): string {
  const f = process.env.FFMPEG_BIN;
  if (f) return f.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');
  return 'ffprobe';
}

// Duration in seconds from ffprobe. Returns null on failure.
export async function probeDuration(file: string): Promise<number | null> {
  try {
    const { stdout } = await execAsync(
      `${ffprobe()} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
      { maxBuffer: 16 * 1024 * 1024, shell: 'cmd.exe' }
    );
    const secs = parseFloat(stdout.trim());
    return Number.isFinite(secs) ? secs : null;
  } catch {
    return null;
  }
}

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function writeJson(file: string, data: unknown) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(0).padStart(2, '0');
  return `00:${String(m).padStart(2, '0')}:${sec}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}