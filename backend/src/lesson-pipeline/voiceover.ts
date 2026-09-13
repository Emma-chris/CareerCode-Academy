import fs from 'fs';
import path from 'path';
import { LessonScript } from './types';
import { run, execAsync, probeDuration, ensureDir, ff } from './utils';

const TTS_VOICE = process.env.TTS_VOICE || 'en-US-AriaNeural';

interface SceneVoice {
  id: string;
  file: string;
  duration: number;
}

let edgeTtsAvailable: boolean | null = null;

export async function hasEdgeTts(): Promise<boolean> {
  if (edgeTtsAvailable !== null) return edgeTtsAvailable;
  for (const cmd of ['python -m edge_tts --help', 'py -3 -m edge_tts --help']) {
    try {
      await execAsync(cmd, { timeout: 60000, shell: 'cmd.exe' });
      edgeTtsAvailable = true;
      return true;
    } catch {}
  }
  edgeTtsAvailable = false;
  return false;
}

async function ttsEdge(moduleCmd: string, text: string, outFile: string): Promise<void> {
  const txtFile = outFile.replace(/\.mp3$/, '.txt');
  fs.writeFileSync(txtFile, text, 'utf8');
  try {
    await run(`${moduleCmd} -m edge_tts --voice ${TTS_VOICE} --file "${txtFile}" --write-media "${outFile}"`, {
      timeout: 120000,
    });
  } finally {
    try { fs.unlinkSync(txtFile); } catch {}
  }
}

async function ttsSapi(text: string, outWav: string): Promise<void> {
  const txtFile = outWav.replace(/\.wav$/, '_in.txt');
  const psFile = outWav.replace(/\.wav$/, '_sapi.ps1');
  fs.writeFileSync(txtFile, text, 'utf8');
  const ps = `Add-Type -AssemblyName System.Speech
$txt = [System.IO.File]::ReadAllText('${txtFile.replace(/\\/g, '\\\\')}')
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0
$synth.SetOutputToWaveFile('${outWav.replace(/\\/g, '\\\\')}')
$synth.Speak($txt)
$synth.Dispose()
`;
  fs.writeFileSync(psFile, ps, 'utf8');
  try {
    await run(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 120000 });
  } finally {
    try { fs.unlinkSync(txtFile); } catch {}
    try { fs.unlinkSync(psFile); } catch {}
  }
}

export async function synthesizeScene(scene: { id: string; narration: string }, audioDir: string): Promise<string> {
  const idx = parseInt(scene.id.replace(/\D/g, ''), 10) || 1;
  const mp3 = path.join(audioDir, `scene_${String(idx).padStart(2, '0')}.mp3`);
  if (fs.existsSync(mp3)) return mp3;

  if (await hasEdgeTts()) {
    try {
      await ttsEdge(process.env.PYTHON_CMD || 'python', scene.narration, mp3);
      if (fs.existsSync(mp3) && (await probeDuration(mp3))) return mp3;
      try { fs.unlinkSync(mp3); } catch {}
    } catch (e: any) {
      console.warn(`    edge-tts failed (${e.message.substring(0, 60)}) → SAPI fallback`);
    }
  }

  const wav = mp3.replace(/\.mp3$/, '.wav');
  await ttsSapi(scene.narration, wav);
  if (!fs.existsSync(wav)) throw new Error(`TTS produced no output for ${scene.id}`);
  await run(`${ff()} -y -i "${wav}" -codec:a libmp3lame -q:a 4 "${mp3}"`, { timeout: 60000 });
  try { fs.unlinkSync(wav); } catch {}
  return mp3;
}

// Ensures every scene has narration audio. Returns per-scene voices in script order.
export async function ensureVoiceover(script: LessonScript, dir: string): Promise<SceneVoice[]> {
  const audioDir = path.join(dir, 'audio');
  ensureDir(audioDir);

  const voices: SceneVoice[] = [];
  for (const scene of script.scenes) {
    let file: string;
    let duration: number | null = null;

    const idx = parseInt(scene.id.replace(/\D/g, ''), 10) || 1;
    const mp3 = path.join(audioDir, `scene_${String(idx).padStart(2, '0')}.mp3`);
    if (fs.existsSync(mp3)) {
      file = mp3;
      duration = await probeDuration(mp3);
    } else {
      file = await synthesizeScene(scene, audioDir);
      duration = await probeDuration(file);
    }

    voices.push({ id: scene.id, file, duration: duration || 0 });
    if (!duration) console.warn(`    ${scene.id}: audio duration unknown, assuming 0`);
  }
  return voices;
}