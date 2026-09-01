import dotenv from 'dotenv'; dotenv.config();
import db from '../config/db';
async function withRetry<T>(fn:()=>Promise<T>, label:string, max=10, delay=2500):Promise<T>{
  for(let i=1;i<=max;i++){
    try{ const r=await fn(); if(i>1) console.log(`✅ ${label} ok on ${i}`); return r; }catch(e:any){
      const m=e.message||String(e); const conn=m.toLowerCase().includes('timeout')||m.toLowerCase().includes('enetunreach')||m.toLowerCase().includes('connect');
      console.log(`⚠️ ${label} try ${i}/${max} fail ${m.slice(0,80)}`);
      if(i===max) throw e; if(conn) try{db.resetPool()}catch{}; await new Promise(r=>setTimeout(r,delay));
    }
  } throw new Error('unreachable');
}
async function run(){
  await withRetry(()=>db.query('SELECT 1'), 'warmup');
  const q=db.query;
  const courses=await withRetry(()=>q('SELECT count(*)::int as c FROM courses'),'courses');
  const lessons=await withRetry(()=>q('SELECT count(*)::int as c FROM lessons'),'lessons');
  const quizzes=await withRetry(()=>q('SELECT count(*)::int as c FROM quizzes'),'quizzes');
  const questions=await withRetry(()=>q('SELECT count(*)::int as c FROM quiz_questions'),'questions');
  const perCourse=await withRetry(()=>q(`
    SELECT c.title, c.category, count(DISTINCT l.id)::int as lessons, count(DISTINCT qu.id)::int as quizzes, count(qq.id)::int as questions
    FROM courses c
    LEFT JOIN lessons l ON l.course_id=c.id
    LEFT JOIN quizzes qu ON qu.lesson_id=l.id
    LEFT JOIN quiz_questions qq ON qq.quiz_id=qu.id
    GROUP BY c.id, c.title, c.category
    ORDER BY c.title
  `),'perCourse');
  console.log(`\nTOTALS: courses=${courses.rows[0].c} lessons=${lessons.rows[0].c} quizzes=${quizzes.rows[0].c} questions=${questions.rows[0].c}`);
  console.log(`Expected: quizzes=lessons=${lessons.rows[0].c} questions=lessons*5=${lessons.rows[0].c*5}`);
  for(const r of perCourse.rows){
    const miss=r.lessons - r.quizzes;
    const bad = r.questions !== r.quizzes*5 ? ` BAD_Q` : '';
    console.log(`${r.title} [${r.category}] lessons=${r.lessons} quizzes=${r.quizzes} questions=${r.questions} miss=${miss}${bad}`);
  }
  const bad=await withRetry(()=>q('SELECT count(*)::int as bad FROM (SELECT quiz_id FROM quiz_questions GROUP BY quiz_id HAVING count(*)!=5) s'),'bad');
  const orphan=await withRetry(()=>q('SELECT count(*)::int as orphan FROM lessons l LEFT JOIN quizzes qu ON qu.lesson_id=l.id WHERE qu.id IS NULL'),'orphan');
  const nullLesson=await withRetry(()=>q('SELECT count(*)::int as n FROM quizzes WHERE lesson_id IS NULL'),'null');
  console.log(`\nChecks: badQuizzes(≠5)=${bad.rows[0].bad} orphanLessons=${orphan.rows[0].orphan} nullLessonQuizzes=${nullLesson.rows[0].n}`);
  const done = orphan.rows[0].orphan===0 && bad.rows[0].bad===0 && quizzes.rows[0].c===lessons.rows[0].c && questions.rows[0].c===lessons.rows[0].c*5;
  console.log(done ? '✅ ALL DONE — every lesson has 1 quiz with 5 Qs (minimal, video-aware)' : '❌ NOT DONE');
  if(!done) process.exit(1);
  const sample=await withRetry(()=>q(`
    SELECT q.title as quiz, c.title as course, l.title as lesson, qq.question, qq.correct_answer
    FROM quizzes q JOIN courses c ON c.id=q.course_id JOIN lessons l ON l.id=q.lesson_id JOIN quiz_questions qq ON qq.quiz_id=q.id
    ORDER BY random() LIMIT 2
  `),'sample');
  console.log('\nRandom sample:');
  console.log(JSON.stringify(sample.rows,null,2));
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
