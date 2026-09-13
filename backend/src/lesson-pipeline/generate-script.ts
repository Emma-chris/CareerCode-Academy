import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { query } from '../config/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LessonScript, LessonReference, ScriptScene, lessonDir, slugify } from './types';
import { parseArgs, readJson, writeJson } from './utils';

/// ---------- LLM draft ----------

function buildPrompt(lesson: any, ref: LessonReference | null): string {
  return `You are a curriculum writer for "Career Code Academy". Produce an ORIGINAL lesson script in YOUR OWN WORDS. You may use a YouTube transcript as reference for ideas, but never copy it verbatim, never reference the video, and never suggest showing footage from it.

LESSON TITLE: ${lesson.title}
COURSE: ${lesson.course_title}
DESCRIPTION: ${lesson.description || '(none)'}
REFERENCE (for ideas only):
${(ref?.transcript || ref?.description || '(no reference)').substring(0, 4500)}

Return ONLY a JSON object (no markdown fences) with this exact shape:
{
  "title": string,
  "learning_objectives": string[] (2-4),
  "key_concepts": [{"title": string, "detail": string}] (3-6),
  "examples": string[] (1-3 original examples),
  "exercise": string (one concrete practice task),
  "scenes": [ {
     "id": "s1", 
     "kind": "title|text|code|diagram|icon|screencast|example|exercise",
     "narration": string (a spoken line, 10-35 words, conversational),
     "heading": string (short on-screen heading, optional),
     "bullets": string[] (for text scenes, optional),
     "code": string (for code scenes, optional, = primary-content lines of code),
     "highlights": number[] (1-based line numbers in code to highlight, optional),
     "labels": string[] (2-3 labels for diagram scenes, optional),
     "icon": string (one word like "Predict", "Loop", "Style" for icon scenes, optional),
     "caption": string (caption under an icon, optional),
     "text": string (body text for example/exercise scenes, optional)
  } ]
}
Requirements: 5-9 scenes total; first scene kind "title" (narration welcomes and states the objective); include at least one "code" scene when the topic is programming; include one "example" and one "exercise" scene; every scene must have a narration line. Narration language: plain spoken English.`;
}

async function draftWithGemini(lesson: any, ref: LessonReference | null): Promise<LessonScript | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(buildPrompt(lesson, ref));
    const text = result.response.text().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const data = JSON.parse(text);
    return data.learning_objectives && data.scenes ? (data as LessonScript) : null;
  } catch (e) {
    console.warn('Gemini draft failed:', (e as Error).message);
    return null;
  }
}

async function draftWithOpenAI(lesson: any, ref: LessonReference | null): Promise<LessonScript | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: buildPrompt(lesson, ref) }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: any = await resp.json();
    const text = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    return parsed.learning_objectives && parsed.scenes ? (parsed as LessonScript) : null;
  } catch (e) {
    console.warn('OpenAI draft failed:', (e as Error).message);
    return null;
  }
}

/// ---------- Heuristic template (no LLM key) ----------

function sentenceSplit(text: string): string[] {
  return (text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
    .slice(0, 4);
}

function heuristicScript(lesson: any): LessonScript {
  const desc = lesson.description || `Learn the fundamentals of ${lesson.title}.`;
  const sentences = sentenceSplit(desc);
  const scenes: ScriptScene[] = [
    {
      id: 's1',
      kind: 'title',
      narration: `Welcome! In this lesson, ${lesson.title}. Let's get started.`,
      heading: lesson.title,
    },
  ];

  sentences.slice(0, 3).forEach((sentence, i) => {
    scenes.push({
      id: `s${i + 2}`,
      kind: 'text',
      narration: sentence,
      heading: i === 0 ? 'Key idea' : 'Going deeper',
      bullets: [sentence],
    });
  });

  if (scenes.length < 3) {
    scenes.push({
      id: `s${scenes.length + 1}`,
      kind: 'text',
      narration: `Let's look at how ${lesson.title} fits into real projects.`,
      heading: 'In practice',
      bullets: [`${lesson.title} is the building block you will use throughout this course.`],
    });
  }

  scenes.push({
    id: `s${scenes.length + 1}`,
    kind: 'example',
    narration: 'Here is an example you can try right away.',
    heading: 'Example',
    text: `Think of a small project that uses ${lesson.title}. Describe one concrete way you would apply it.`,
  });
  scenes.push({
    id: `s${scenes.length + 1}`,
    kind: 'exercise',
    narration: 'Now it is your turn. Complete the exercise below to practice.',
    heading: 'Exercise',
    text: `Explain ${lesson.title} in your own words and give one original example of where you would use it.`,
  });

  return {
    lesson_id: lesson.id,
    title: lesson.title,
    generated_by: 'rules',
    status: 'draft',
    learning_objectives: [`Understand the core ideas of ${lesson.title}.`],
    key_concepts: sentences.slice(0, 3).map((s) => ({ title: s.split(' ').slice(0, 6).join(' '), detail: s })),
    examples: [
      `A small personal project demonstrating ${lesson.title}.`,
    ],
    exercise: `Explain ${lesson.title} in your own words and give one original example of where you would use it.`,
    scenes,
  };
}

/// ---------- Normalization (guard rails on LLM output) ----------

function normalize(script: LessonScript, lesson: any): LessonScript {
  const kinds = ['title', 'text', 'code', 'diagram', 'icon', 'screencast', 'example', 'exercise'];
  const scenes: ScriptScene[] = (script.scenes || []).slice(0, 10).map((s: any, i: number) => ({
    id: s.id || `s${i + 1}`,
    kind: kinds.includes(s.kind) ? (s.kind as ScriptScene['kind']) : 'text',
    narration: (s.narration || s.caption || s.heading || 'Let\'s continue.').substring(0, 500),
    heading: s.heading,
    bullets: Array.isArray(s.bullets) ? s.bullets.slice(0, 4) : undefined,
    code: s.code,
    highlights: Array.isArray(s.highlights) ? s.highlights : undefined,
    labels: Array.isArray(s.labels) ? s.labels.slice(0, 4) : undefined,
    icon: s.icon,
    caption: s.caption,
    text: s.text,
  }));

  // Guarantee a title opener and exercise closer.
  if (!scenes.some((s) => s.kind === 'title')) {
    scenes.unshift({
      id: 's1',
      kind: 'title',
      narration: `Welcome! In this lesson, ${lesson.title}.`,
      heading: lesson.title,
    });
  }
  if (!scenes.some((s) => s.kind === 'exercise')) {
    scenes.push({
      id: `s${scenes.length + 1}`,
      kind: 'exercise',
      narration: 'Now it is your turn. Complete the exercise to practice.',
      heading: 'Exercise',
      text: script.exercise || `Practice ${lesson.title} with your own example.`,
    });
  }

  return {
    lesson_id: lesson.id,
    title: script.title || lesson.title,
    generated_by: script.generated_by,
    status: script.status,
    learning_objectives: (script.learning_objectives || [lesson.title]).slice(0, 4),
    key_concepts: (script.key_concepts || []).slice(0, 6),
    examples: (script.examples || []).slice(0, 3),
    exercise: script.exercise || script.examples?.[0] || 'Practice what you learned with your own example.',
    scenes,
  };
}

/// ---------- CLI ----------

async function generateScript(opts: { lesson?: string; course?: string; auto?: boolean }) {
  let targetId = opts.lesson;
  if (!targetId && opts.course) {
    const { rows } = await query(
      `SELECT l.id FROM lessons l JOIN courses c ON c.id = l.course_id
        WHERE c.slug = $1 AND l.script IS NULL ORDER BY l.order_index LIMIT 1`,
      [opts.course]
    );
    targetId = rows[0]?.id;
  }
  if (!targetId) {
    console.error('Provide --lesson <id> or --course <slug>');
    process.exit(1);
  }

  const { rows } = await query(
    `SELECT l.id, l.title, l.description, l.video_url,
            c.slug AS course_slug, c.title AS course_title, c.description AS course_description
       FROM lessons l JOIN courses c ON c.id = l.course_id
      WHERE l.id = $1`,
    [targetId]
  );
  const lesson = rows[0];
  if (!lesson) {
    console.error(`Lesson not found: ${targetId}`);
    process.exit(1);
  }

  const dir = path.join(process.cwd(), lessonDir(lesson.course_slug, slugify(lesson.title)));
  const ref = readJson<LessonReference>(path.join(dir, 'reference.json'));

  let script: LessonScript | null = null;
  let source: 'llm' | 'rules' | null = null;

  if (opts.auto && (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)) {
    const useGemini = !!process.env.GEMINI_API_KEY;
    console.log(`Drafting script with ${useGemini ? 'Gemini' : 'OpenAI'}...`);
    const draft = useGemini ? await draftWithGemini(lesson, ref) : await draftWithOpenAI(lesson, ref);
    if (draft) {
      script = normalize({ ...draft, generated_by: 'llm', status: 'reviewed' }, lesson);
      source = 'llm';
    } else {
      console.warn('LLM draft unavailable — falling back to heuristic draft.');
    }
  }

  if (!script) {
    script = heuristicScript(lesson);
    source = 'rules';
  }

  const scriptFile = path.join(dir, 'script.json');
  writeJson(scriptFile, script);

  console.log('script.json written.');
  console.log(`  generated_by:  ${source}`);
  console.log(`  status:        ${script.status}${script.status === 'draft' ? '  (render is blocked until reviewed or --force)' : ''}`);
  console.log(`  scenes:        ${script.scenes.length}`);
  console.log(`  location:      ${scriptFile}`);
  if (source === 'rules') {
    console.warn('\nHeuristic template — edit it in your own words and set "status":"reviewed", or re-run with a GEMINI_API_KEY/OPENAI_API_KEY and --auto.');
  }

  process.exit(0);
}

generateScript(parseArgs(process.argv.slice(2)) as any).catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});