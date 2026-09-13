-- Lesson Production Pipeline: store the authored lesson script (objectives,
-- key concepts, narration lines, on-screen cues, examples, exercises) so the
-- video pipeline can render it and quiz generation can consume it.

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS script JSONB;

-- Optional: track which YouTube video was used only as research reference.
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS reference_source JSONB;

-- Index-less by design: scripts are per-lesson documents, not query filters.