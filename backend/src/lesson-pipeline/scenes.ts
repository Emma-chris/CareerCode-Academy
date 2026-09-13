import fs from 'fs';
import path from 'path';
import { execAsync, ensureDir, ff } from './utils';
import { ScriptScene, MIN_SCENE_SECONDS } from './types';

const W = 1280;
const H = 720;
const ARIAL = 'C:/Windows/Fonts/arial.ttf';
const CONSOLA = 'C:/Windows/Fonts/consola.ttf';

const BG_PALETTE = ['0d1527', '0f172a', '131a33', '1c1530', '16171c', '101a2c'];

function wrap(text: string, width: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > width) {
      if (cur) lines.push(cur.trim());
      cur = word;
    } else {
      cur += ' ' + word;
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.join('\n');
}

async function ensureFonts(tmpDir: string): Promise<void> {
  ensureDir(tmpDir);
  if (!fs.existsSync(path.join(tmpDir, 'font.ttf'))) {
    try { fs.copyFileSync(ARIAL, path.join(tmpDir, 'font.ttf')); } catch {}
  }
  if (!fs.existsSync(path.join(tmpDir, 'mono.ttf'))) {
    try { fs.copyFileSync(CONSOLA, path.join(tmpDir, 'mono.ttf')); } catch { fs.copyFileSync(ARIAL, path.join(tmpDir, 'mono.ttf')); }
  }
}

function padDuration(scene: ScriptScene, requested: number): number {
  const words = (scene.narration || '').split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_SCENE_SECONDS, requested, Math.ceil(words * 0.28 + 1.4));
}

export async function renderScene(ctx: {
  courseTitle: string;
  lessonTitle: string;
  scene: ScriptScene;
  index: number;
  duration: number;
  cwd: string;
}): Promise<string> {
  const { scene, index } = ctx;
  const dur = padDuration(scene, ctx.duration);
  const tag = `s${String(index + 1).padStart(2, '0')}`;
  const outFile = path.join(ctx.cwd, 'scenes', `scene_${tag}.mp4`);
  const tmpDir = path.join(ctx.cwd, '_tmp');
  await ensureFonts(tmpDir);

  const rel = (name: string) => `./_tmp/${name}`;
  const write = (name: string, text: string) => fs.writeFileSync(path.join(tmpDir, name), text, 'utf8');

  const durArg = String(dur).replace(/\./g, ',');
  const bg = BG_PALETTE[index % BG_PALETTE.length];
  const accent = index % 2 === 0 ? '0x3B82F6' : '0x8B5CF6';
  const kind = scene.kind || 'text';
  const heading = (scene.heading || scene.narration.split('.').slice(0, 3).join('.') || 'CareerCode Academy').substring(0, 70);

  write('t_course.txt', ctx.courseTitle);
  write('t_heading.txt', heading);
  write('t_brand.txt', 'CareerCode Academy — original lesson');

  // ---- static color sources (only the ones this scene uses) ----
  const diagramLabels = (scene.labels && scene.labels.length ? scene.labels : (scene.bullets || [scene.narration])).slice(0, 4);
  const diagramN = Math.max(2, Math.min(4, diagramLabels.length));
  const srcs: string[] = [
    `color=c=${bg}:s=${W}x${H}:d=${durArg}[base0]`,
    `color=c=${accent}:s=${W}x6:d=${durArg}[hb]`,
  ];
  if (['title', 'text', 'icon', 'example', 'exercise'].includes(kind)) srcs.push(`color=c=${accent}:s=90x4:d=${durArg}[rule]`);
  if (kind === 'example' || kind === 'exercise') srcs.push(`color=c=${accent}:s=140x34:d=${durArg}[bdg]`);
  if (kind === 'icon') srcs.push(`color=c=${accent}:s=200x200:d=${durArg}[chip]`);
  if (kind === 'diagram') {
    for (let i = 0; i < diagramN; i++) srcs.push(`color=c=0x13203A:s=300x140:d=${durArg}[bx${i}]`);
  }
  if (kind === 'code') srcs.push(
    `color=c=0x0B1020:s=980x400:d=${durArg}[panel]`,
    `color=c=0x0B1020:s=980x36:d=${durArg}[hlb]`
  );
  if (kind === 'screencast') srcs.push(
    `color=c=0x111827:s=1000x400:d=${durArg}[wnd]`,
    `color=c=0x1F2937:s=1000x34:d=${durArg}[titlebar]`,
    `color=c=0x64748B:s=12x12:d=${durArg}[dot0]`,
    `color=c=0x64748B:s=12x12:d=${durArg}[dot1]`,
    `color=c=0x64748B:s=12x12:d=${durArg}[dot2]`
  );
  let f = srcs.join(';') + `;[base0][hb]overlay=0:0[base];` +
    `[base]drawtext=textfile=${rel('t_course.txt')}:fontfile=${rel('font.ttf')}:fontsize=15:fontcolor=0x64748B:x=40:y=24[c1];`;

  let prev = 'c1';

  // Append a single filter chain: [prev]<expr>[out];
  const nf = (expr: string, out: string) => {
    f += `[${prev}]${expr}[${out}];`;
    prev = out;
  };
  const head = (out: string, size = 38) => {
    nf(`drawtext=textfile=${rel('t_heading.txt')}:fontfile=${rel('font.ttf')}:fontsize=${size}:fontcolor=0xFFFFFF:x=(w-text_w)/2:y=86:alpha='min(1\\,max(0\\,t-0.3))'`, out);
  };
  const ruleUnder = (out: string) => {
    f += `[${prev}][rule]overlay=x=(w-70)/2:y=138[${out}];`;
    prev = out;
  };
  const captionAt = (text: string, y: number, out: string) => {
    write(`t_cap_${out}.txt`, wrap(text, 52));
    nf(`drawtext=textfile=${rel(`t_cap_${out}.txt`)}:fontfile=${rel('font.ttf')}:fontsize=22:fontcolor=0xCBD5E1:x=(w-text_w)/2:y=${y}:line_spacing=8:alpha='min(1\\,max(0\\,t-0.8))'`, out);
  };

  if (kind === 'title') {
    write('t_lesson.txt', `Lesson ${index + 1}`);
    f += `[c1]drawtext=textfile=${rel('t_lesson.txt')}:fontfile=${rel('font.ttf')}:fontsize=18:fontcolor=0x94A3B8:x=(w-text_w)/2:y=170:alpha='min(1\\,max(0\\,t-0.2))'[t0];`;
    prev = 't0';
    nf(`drawtext=textfile=${rel('t_heading.txt')}:fontfile=${rel('font.ttf')}:fontsize=54:fontcolor=0xFFFFFF:x=(w-text_w)/2:y=240:alpha='min(1\\,max(0\\,t-0.4))'`, 't1');
    f += `[t1][rule]overlay=x=(w-90)/2:y=322[t2];`;
    prev = 't2';
  } else if (kind === 'text') {
    head('h');
    ruleUnder('h2');
    const bullets = (scene.bullets && scene.bullets.length ? scene.bullets : [scene.narration]).slice(0, 4);
    bullets.forEach((b, i) => {
      write(`t_b${i}.txt`, `•  ${wrap(b, 62)}`);
      nf(`drawtext=textfile=${rel(`t_b${i}.txt`)}:fontfile=${rel('font.ttf')}:fontsize=24:fontcolor=0xE2E8F0:x=140:y=${250 + i * 82}:line_spacing=8:alpha='min(1\\,max(0\\,t-${0.9 + i * 0.5}))'`, `bl${i}`);
    });
  } else if (kind === 'icon') {
    head('h');
    ruleUnder('h2');
    write('t_icon.txt', wrap((scene.icon || 'CONCEPT').substring(0, 12).toUpperCase(), 8));
    f += `[h2][chip]overlay=x=(w-200)/2:y=240:alpha='min(1\\,max(0\\,t-0.5))'[chip2];`;
    prev = 'chip2';
    nf(`drawtext=textfile=${rel('t_icon.txt')}:fontfile=${rel('font.ttf')}:fontsize=34:fontcolor=0x0B1020:x=(w-text_w)/2:y=318:alpha='min(1\\,max(0\\,t-0.6))'`, 'ic');
    if (scene.caption) captionAt(scene.caption, 472, 'cap');
  } else if (kind === 'example' || kind === 'exercise') {
    head('h');
    ruleUnder('h2');
    write('t_badge.txt', kind === 'example' ? 'Example' : 'Exercise');
    f += `[h2][bdg]overlay=x=(w-140)/2:y=170[bd2];`;
    prev = 'bd2';
    nf(`drawtext=textfile=${rel('t_badge.txt')}:fontfile=${rel('font.ttf')}:fontsize=16:fontcolor=0x0B1020:x=(w-text_w)/2:y=179:alpha='min(1\\,max(0\\,t-0.4))'`, 'bd3');
    write('t_body.txt', wrap(scene.text || scene.narration, 56));
    nf(`drawtext=textfile=${rel('t_body.txt')}:fontfile=${rel('font.ttf')}:fontsize=24:fontcolor=0xE2E8F0:x=150:y=252:line_spacing=14:alpha='min(1\\,max(0\\,t-0.6))'`, 'bd4');
  } else if (kind === 'code') {
    nf(`drawtext=textfile=${rel('t_heading.txt')}:fontfile=${rel('font.ttf')}:fontsize=30:fontcolor=0xFFFFFF:x=80:y=54:alpha='min(1\\,max(0\\,t-0.3))'`, 'ch');
    const codeLines = (scene.code || '').split('\n').filter((l) => l.trim()).slice(0, 9);
    if (codeLines.length === 0) codeLines.push('// add your code here');
    write('t_code.txt', codeLines.map((l) => wrap(l || ' ', 44)).join('\n'));
    const panelH = codeLines.length * 40 + 40;
    const codeTop = 150;
    f += `[ch][panel]overlay=x=150:y=${codeTop}[cp];`;
    prev = 'cp';
    (scene.highlights || []).slice(0, 6).forEach((ln) => {
      const y = codeTop + 12 + (ln - 1) * 40;
      f += `[${prev}][hlb]overlay=x=154:y=${y}[hl${ln}];`;
      prev = `hl${ln}`;
    });
    nf(`drawtext=textfile=${rel('t_code.txt')}:fontfile=${rel('mono.ttf')}:fontsize=24:fontcolor=0xD8F5FF:x=168:y=${codeTop + 12}:line_spacing=8:alpha='min(1\\,max(0\\,t-0.5))'`, 'cd');
    if (scene.caption) {
      write('t_codecap.txt', wrap(scene.caption, 70));
      nf(`drawtext=textfile=${rel('t_codecap.txt')}:fontfile=${rel('font.ttf')}:fontsize=19:fontcolor=0x94A3B8:x=150:y=${codeTop + panelH + 22}:line_spacing=6:alpha='min(1\\,max(0\\,t-0.9))'`, 'cd2');
    }
  } else if (kind === 'diagram') {
    nf(`drawtext=textfile=${rel('t_heading.txt')}:fontfile=${rel('font.ttf')}:fontsize=30:fontcolor=0xFFFFFF:x=(w-text_w)/2:y=60:alpha='min(1\\,max(0\\,t-0.3))'`, 'dh');
    const labels = diagramLabels;
    const n = diagramN;
    const bw = 300, gap = 90, boxY = 250, bh = 140;
    const startX = (W - (n * bw + (n - 1) * gap)) / 2;
    let pv = 'dh';
    for (let i = 0; i < n; i++) {
      const x = startX + i * (bw + gap);
      f += `[${pv}][bx${i}]overlay=x=${x}:y=${boxY}[d${i}a];`;
      f += `[d${i}a]drawbox=x=${x}:y=${boxY}:w=${bw}:h=${bh}:color=0x27365C:t=3[db${i}];`;
      pv = `db${i}`;
    }
    for (let i = 0; i < n - 1; i++) {
      const x1 = startX + i * (bw + gap) + bw;
      const x2 = startX + (i + 1) * (bw + gap);
      f += `[${pv}]drawbox=x=${x1}:y=${boxY + bh / 2 - 1}:w=${x2 - x1}:h=3:color=${accent}:t=fill[cn${i}];`;
      pv = `cn${i}`;
    }
    for (let i = 0; i < n; i++) {
      write(`t_dl${i}.txt`, wrap(labels[i], 18));
      const x = startX + i * (bw + gap);
      f += `[${pv}]drawtext=textfile=${rel(`t_dl${i}.txt`)}:fontfile=${rel('font.ttf')}:fontsize=20:fontcolor=0xE2E8F0:x=${x + 20}:y=${boxY + 50}:line_spacing=6:alpha='min(1\\,max(0\\,t-0.5))'[tl${i}];`;
      pv = `tl${i}`;
    }
    prev = pv;
  } else if (kind === 'screencast') {
    nf(`drawtext=textfile=${rel('t_heading.txt')}:fontfile=${rel('font.ttf')}:fontsize=30:fontcolor=0xFFFFFF:x=80:y=54:alpha='min(1\\,max(0\\,t-0.3))'`, 'sh');
    const winW = 1000, winH = 400, winX = 140, winY = 150;
    const lines = (scene.code || '').split('\n').filter(Boolean).slice(0, 7);
    write('t_shot.txt', wrap(lines.length ? lines.join('\n') : '// your app code here', 40));
    f += `[sh][wnd]overlay=x=${winX}:y=${winY}[w0];`;
    f += `[w0][titlebar]overlay=x=${winX}:y=${winY}[w1];`;
    f += `[w1][dot0]overlay=x=${winX + 20}:y=${winY + 11}[w2];`;
    f += `[w2][dot1]overlay=x=${winX + 46}:y=${winY + 11}[w3];`;
    f += `[w3][dot2]overlay=x=${winX + 72}:y=${winY + 11}[w4];`;
    f += `[w4]drawtext=textfile=${rel('t_shot.txt')}:fontfile=${rel('mono.ttf')}:fontsize=22:fontcolor=0xD8F5FF:x=${winX + 30}:y=${winY + 62}:line_spacing=8:alpha='min(1\\,max(0\\,t-0.5))'[w5];`;
    f += `[w5]drawbox=x=${winX}:y=${winY}:w=4:h=${winH}:color=${accent}:t=fill[wb5];`;
    prev = 'wb5';
    if (scene.caption) {
      write('t_shotcap.txt', wrap(scene.caption, 66));
      nf(`drawtext=textfile=${rel('t_shotcap.txt')}:fontfile=${rel('font.ttf')}:fontsize=20:fontcolor=0x94A3B8:x=${winX}:y=${winY + winH + 20}:line_spacing=6:alpha='min(1\\,max(0\\,t-0.9))'`, 'wb6');
    }
  }

  // Brand footer + output label
  f += `[${prev}]drawtext=textfile=${rel('t_brand.txt')}:fontfile=${rel('font.ttf')}:fontsize=13:fontcolor=0x475569:x=W-text_w-40:y=686[out]`;

  const fpath = path.join(tmpDir, `${tag}_filter.txt`);
  fs.writeFileSync(fpath, f, 'utf8');

  process.stdout.write(`  [${ctx.index + 1}] ${kind} (${dur}s)...`);

  if (f.includes('"')) throw new Error(`filter graph for ${tag} contains a double quote`);

  const renderBat = path.join(tmpDir, `${tag}_render.bat`);
  const batContent = `@echo off
${ff()} -y -f lavfi -i "color=c=${bg}:s=${W}x${H}:d=${durArg}" -filter_complex "${f}" -map "[out]" -c:v libx264 -preset fast -crf 24 -pix_fmt yuv420p -movflags +faststart "${outFile}"
`;
  fs.writeFileSync(renderBat, batContent, 'utf8');

  return new Promise((resolve, reject) => {
    execAsync(`call "${renderBat}"`, { cwd: ctx.cwd, maxBuffer: 256 * 1024 * 1024, shell: 'cmd.exe' })
      .then(() => {
        if (!fs.existsSync(outFile)) reject(new Error(`scene render produced no file: ${outFile}`));
        else resolve(outFile);
      })
      .catch((e: any) => reject(new Error(e.stderr || e.message)));
  });
}

export async function renderScenes(ctx: {
  courseTitle: string;
  lessonTitle: string;
  scenes: ScriptScene[];
  durations: number[];
  cwd: string;
}): Promise<string[]> {
  ensureDir(path.join(ctx.cwd, 'scenes'));
  const out: string[] = [];
  for (let i = 0; i < ctx.scenes.length; i++) {
    const file = await renderScene({
      courseTitle: ctx.courseTitle,
      lessonTitle: ctx.lessonTitle,
      scene: ctx.scenes[i],
      index: i,
      duration: ctx.durations[i] ?? 8,
      cwd: ctx.cwd,
    });
    out.push(file);
    process.stdout.write(' done\n');
  }
  return out;
}