import dotenv from 'dotenv'; dotenv.config();
import db from '../config/db';
import fs from 'fs';
import path from 'path';

async function withRetry<T>(fn:()=>Promise<T>, label:string, max=20, delay=3500):Promise<T>{
  for(let i=1;i<=max;i++){
    try{ const r=await fn(); if(i>1) console.log(`✅ ${label} ok on ${i}`); return r; }catch(e:any){
      const m=e.message||String(e); const conn=m.toLowerCase().includes('timeout')||m.toLowerCase().includes('enetunreach')||m.toLowerCase().includes('connect');
      console.log(`⚠️ ${label} try ${i}/${max} fail ${m.slice(0,80)}`);
      if(i===max) throw e; if(conn) try{db.resetPool()}catch{}; await new Promise(r=>setTimeout(r,delay));
    }
  } throw new Error('unreachable');
}

function escapeCsv(v: string): string {
  if (v==null) return '';
  const s=String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) return `"${s.replace(/"/g,'""')}"`;
  return s;
}

async function main(){
  const q=db.query;
  await withRetry(()=>q('SELECT 1'),'warmup');
  console.log('📄 Exporting quizzes to CSV (easy difficulty)...');
  const {rows}=await withRetry(()=>q(`
    SELECT
      c.id as course_id, c.title as course_title, c.category as course_category, c.level as course_level,
      m.title as module_title,
      l.id as lesson_id, l.title as lesson_title, l.description as lesson_description,
      qu.id as quiz_id, qu.title as quiz_title,
      qq.id as question_id, qq.question, qq.options, qq.correct_answer, qq.points, qq.order_index
    FROM quizzes qu
    JOIN courses c ON c.id=qu.course_id
    JOIN lessons l ON l.id=qu.lesson_id
    LEFT JOIN modules m ON m.id=l.module_id
    JOIN quiz_questions qq ON qq.quiz_id=qu.id
    ORDER BY c.created_at, m.order_index NULLS LAST, l.order_index, qq.order_index
  `),'fetch all');
  console.log(`Found ${rows.length} questions (expected 2100)`);

  const headers = [
    'course_id','course_title','course_category','course_level',
    'module_title','lesson_id','lesson_title','lesson_description',
    'quiz_id','quiz_title',
    'question_id','question','option_a','option_b','option_c','option_d','correct_answer','difficulty','points','order_index'
  ];
  const csvRows:string[]=[headers.map(escapeCsv).join(',')];
  for(const r of rows){
    let opts:string[]=[];
    try{ opts = typeof r.options==='string' ? JSON.parse(r.options) : r.options; }catch{ opts=[]; }
    if(!Array.isArray(opts)) opts=[];
    // ensure 4 options
    while(opts.length<4) opts.push('');
    const row=[
      r.course_id, r.course_title, r.course_category, r.course_level,
      r.module_title||'', r.lesson_id, r.lesson_title, r.lesson_description,
      r.quiz_id, r.quiz_title,
      r.question_id, r.question, opts[0]||'', opts[1]||'', opts[2]||'', opts[3]||'', r.correct_answer, 'easy', r.points, r.order_index
    ].map(v=>escapeCsv(v as string));
    csvRows.push(row.join(','));
  }
  const csvContent=csvRows.join('\n');
  const outPath = path.join(__dirname, '../../quizzes-easy.csv');
  const outPath2 = path.join(__dirname, '../../../quizzes-easy.csv');
  fs.writeFileSync(outPath, csvContent, 'utf-8');
  fs.writeFileSync(outPath2, csvContent, 'utf-8');
  console.log(`✅ CSV written to ${outPath} and ${outPath2} — ${rows.length} rows + header`);
  console.log(`Header: ${headers.join(',')}`);
  console.log(`Sample row 1: ${csvRows[1].slice(0,300)}...`);
  // also write json for debug
  const jsonPath=path.join(__dirname, '../../quizzes-easy.json');
  fs.writeFileSync(jsonPath, JSON.stringify(rows,null,2).slice(0,5000)+'\n... total '+rows.length, 'utf-8');
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
