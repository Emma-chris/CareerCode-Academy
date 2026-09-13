// Shared types for the lesson production pipeline.

export type SceneKind =
  | 'title'
  | 'text'
  | 'code'
  | 'diagram'
  | 'icon'
  | 'screencast'
  | 'example'
  | 'exercise';

export interface ScriptScene {
  id: string;                 // 's1', 's2', ...
  kind: SceneKind;
  narration: string;          // line spoken by the voiceover
  heading?: string;           // heading shown on screen
  bullets?: string[];         // for kind === 'text'
  code?: string;              // for kind === 'code' | 'screencast'
  highlights?: number[];      // 1-based line numbers to highlight
  labels?: string[];          // for kind === 'diagram' (box labels)
  icon?: string;              // for kind === 'icon'
  caption?: string;           // for kind === 'icon'
  text?: string;              // for kind === 'example' | 'exercise' (body text)
}

export interface LessonScript {
  lesson_id: string;
  title: string;
  generated_by: 'manual' | 'rules' | 'llm';
  status: 'draft' | 'reviewed';
  learning_objectives: string[];
  key_concepts: { title: string; detail: string }[];
  examples: string[];
  exercise: string;
  scenes: ScriptScene[];
}

export interface LessonReference {
  lesson_id: string;
  source: {
    youtube_id?: string;
    url?: string;
    title?: string;
    channel?: string;
    duration?: number;
  } | null;
  description?: string;
  transcript?: string;
  captured_at: string;
}

export interface SceneAudio {
  id: string;
  file: string;         // absolute path to scene mp3
  duration: number;     // seconds
}

export const ORIGINALS_ROOT = 'generated-lessons';

export function lessonDir(courseSlug: string, lessonSlug: string): string {
  return `${ORIGINALS_ROOT}/${courseSlug}/${lessonSlug}`;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 60);
}

// Scene kinds that show only text-styled content also get a small extra
// duration so the narration is never clipped.
export const MIN_SCENE_SECONDS = 4;
export const NARRATION_SECONDS_PER_WORD = 0.28;
export const SCENE_NARRATION_PAD = 0.9;