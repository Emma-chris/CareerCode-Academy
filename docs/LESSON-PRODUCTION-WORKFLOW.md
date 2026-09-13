# Career Code Academy — Lesson Production Workflow

> **Policy:** Third-party videos (YouTube, etc.) are **research/reference only**.
> They are never reused, embedded, re-uploaded, or redistributed as lesson
> content on the platform. Every lesson ships an **original** narrated video
> produced by this pipeline: original script, original voiceover, original
> motion graphics, and original examples/exercises.

## Pipeline at a glance

```
YouTube / reference
   └─-> 1. RESEARCH   fetch-reference.ts   (yt-dlp: transcript + metadata ONLY)
              └─-> 2. SCRIPT    generate-script.ts   (script.json, human "own words" gate)
                     └─-> 3. VOICEOVER generate-voiceover.ts (free TTS → per-scene MP3)
                            └─-> 4. MOTION GRAPHICS generate-scenes.ts (ffmpeg scenes)
                                   └─-> 5. RENDER    render-lesson-video.ts (concat + mux + S3)
                                          └─-> 6. DELIVER  UPDATE lessons.video_url
```

Everything lives in `backend/src/lesson-pipeline/`. Assets per lesson are
written to `backend/generated-lessons/<courseSlug>/<lessonSlug>/` (gitignored).

## Stage 1 — Research (reference only)

`npm run lesson:reference -- --lesson <id>`

- Runs `yt-dlp` to fetch **transcript + metadata + description** for the
  lesson's current YouTube URL (if one exists). It never downloads/re-encodes
  the video.
- Output: `reference.json`. If the lesson has no YouTube URL, a reference is
  still written from the lesson title/description so the script stage has input.

**Acceptance criteria:** `reference.json` exists, labels the source URL, and
contains no media files.

## Stage 2 — Script (in your own words)

`npm run lesson:script -- --lesson <id> [--auto]`

- Builds a structured `script.json`:
  `learning_objectives`, `key_concepts`, `scenes[]` (each with narration text,
  on-screen content, and a scene kind), `examples`, `exercise`.
- **Automated draft:** if `GEMINI_API_KEY`/`OPENAI_API_KEY` is set, the boss
  model drafts a script from the reference + lesson metadata.
- **Manual template:** with no key, a fill-in skeleton is produced. You write
  the script in your own words by editing `script.json`.
- **Own-words gate:** `script.json` starts `status: "draft"`. The renderer
  refuses to publish drafts unless `--force` is passed. With `--auto` the
  generated draft is marked `status: "reviewed"` (bulk migration path).

**Acceptance criteria:** script is original phrasing, references no clips, and
clearly states objectives + at least one exercise.

## Stage 3 — Voiceover (free TTS)

`npm run lesson:voiceover -- --lesson <id>`

- For each scene narration line, generates `audio/scene_<n>.mp3`.
- TTS adapter priority:
  1. `python -m edge_tts` (free, natural voices; `pip install edge-tts`).
  2. Windows SAPI via PowerShell (fallback, robotic but zero-dependency).
- Per-scene audio durations are measured with `ffprobe` and drive scene timing.

**Acceptance criteria:** one MP3 per narration line, silence-padded as needed,
intelligible voice, no background music (YouTube) audio anywhere.

## Stage 4 — Motion graphics (original)

`npm run lesson:scenes -- --lesson <id>`

Extends the existing ffmpeg `drawtext`/overlay generators. Each scene is a
fresh, original composition, rendered at 1280x720 against lesson-branded
backgrounds:

| Scene kind     | What it renders                                              |
|----------------|--------------------------------------------------------------|
| `title`        | Lesson title slide with course/lesson brand bar              |
| `text`         | Animated heading + bullets (slide/fade via enable timelines) |
| `code`         | Monospace code block, line-by-line highlight                 |
| `diagram`      | Labeled boxes (drawbox) with connectors — concept maps       |
| `icon`         | Large glyph + caption (concept iconography)                  |
| `screencast`   | Mock app/browser window frame with steps                     |
| `example`      | "Example" slide with own example text                        |
| `exercise`     | "Exercise" slide with the task prompt                        |

No material from any third-party video (frames, graphics, footage, audio) is
used.

**Acceptance criteria:** animations explain the concept without using any
non-original frame or asset.

## Stage 5 — Render (assembly + audio mux)

`npm run lesson:render -- --lesson <id> [--force]`

- Concatenates all scenes into `visual.mp4` (concat demuxer).
- Places each narration MP3 on the timeline (`adelay` at scene start,
  `apad`/`atrim` to scene duration), mixes with `amix`, muxes AAC audio.
- Extracts a poster thumbnail (`lesson.jpg` at ~1s).
- Uploads MP4 + JPG to S3 (`uploadFile`) and updates
  `lessons.video_url` / `lessons.video_thumbnail`.

**Acceptance criteria:** video plays in the student player, narration syncs
with scenes, thumbnail displays.

## Stage 6 — Delivery / verification

- Admin preview → check the rendered lesson in the student UI.
- `node backend/src/_check-videos.ts` (or `_check-videos` port) counts
  lessons with/without video.
- Re-run quiz generation against `lessons.script` (see scripts below).

## Bulk migration of existing lessons

`npm run lesson:migrate -- [--course <slug>] [--limit N] [--resume]`

- Processes every lesson that has **no `script`** yet.
- For each: reference → script (`--auto`) → voiceover → scenes → render → S3.
- Manual (draft) scripts are skipped with a warning; run `lesson:render --force`
  after human review to finish them.
- Resumable via `lesson_migration_progress.json` (safe to interrupt).

> Run it pilot-first: pick one course (`--course <slug> --limit 1`), eyeball the
> output, then scale. Consider staggering renders to avoid saturating the CPU.

## Quiz generation now derives from scripts

`scripts/seed-quizzes-from-transcripts.py` prefers `lessons.script` (objectives,
key concepts, examples, exercise). It only falls back to a YouTube description
when no script exists — and never copies the video itself.

## Opinions / guardrails

- Never set `lessons.video_url` to a third-party embed URL.
- Always give credit in `reference_source` for ideas used as research.
- A script is only ever `reviewed` by a person (or by `--auto` for bulk).
- Keep narration short (~15–20s per scene) to stay digestible.
- Add your own examples and exercises to every lesson — don't just restate the
  reference.