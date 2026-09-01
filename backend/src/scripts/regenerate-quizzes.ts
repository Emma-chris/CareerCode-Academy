import dotenv from 'dotenv';
dotenv.config();
import db from '../config/db';
type LessonRow = {
  lesson_id: string;
  lesson_title: string;
  lesson_description: string;
  lesson_duration: number;
  lesson_order: number;
  course_id: string;
  module_id: string | null;
  module_title: string | null;
  course_title: string;
  course_category: string;
  course_level: string;
};
function hashString(s: string): number { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }
function shuffleOptions(options: string[], seed: number): string[] { const arr=[...options]; const rot=seed%arr.length; return [...arr.slice(rot),...arr.slice(0,rot)]; }
function truncate(s: string, max=180): string { if(!s) return s; return s.length>max ? s.slice(0,max-3)+'...' : s; }
function safeDuration(raw: number): number {
  if (!raw || isNaN(raw as any)) return 30;
  if (raw > 0 && raw <= 180) return raw;
  // DB has corrupted large values (e.g., 16012) — cap to 30 min demo
  return 30;
}
function generateQuestionsForLesson(row: LessonRow): Array<{ question:string; options:string[]; correct_answer:string; points:number; order_index:number }>{
  const lessonTitle=row.lesson_title; const moduleTitle=row.module_title||'this module'; const courseTitle=row.course_title; const category=row.course_category; const level=row.course_level; const desc=row.lesson_description?.trim()||`Core concepts and practical skills for ${lessonTitle}`; const shortDesc=truncate(desc,180); const duration=safeDuration(row.lesson_duration); const keyPhrase=desc.split(/[.,;]/)[0].trim().slice(0,90)||lessonTitle; const lowerKey=keyPhrase.toLowerCase();
  const categoryDistractors: Record<string,string[]> = {
    'Programming':['Manual memory allocation in C','Photoshop layer management','Legal contract drafting'],
    'Data Science':['Oil painting techniques','Classical music composition','Construction site management'],
    'Computer Science':['Biology photosynthesis process','Fashion design patterns','Culinary knife skills'],
    'Web Development':['Quantum physics equations','Automotive engine repair','Ancient history timelines'],
    'Mobile':['Desktop printer setup','Network cable crimping','Pottery wheel throwing'],
    'Databases':['Graphic logo creation','Video editing transitions','Public speaking rhetoric'],
    'Networking':['Baking bread recipes','Watercolor painting','Dance choreography'],
    'Cloud Computing':['Handwriting calligraphy','Gardening soil preparation','Poetry analysis'],
    'AI':['Handcrafted woodworking','Traditional weaving','Stone masonry'],
    'Software Engineering':['Chemical lab safety','Film directing','Fashion styling'],
    'Security':['Wildlife photography','Interior decoration','Music theory'],
  };
  const defaultDistractors=['Unrelated administrative paperwork','Random trivia without context','Outdated manual procedures'];
  const distracts=categoryDistractors[category]||defaultDistractors;
  const questions: Array<{question:string; options:string[]; correct_answer:string}> = [];
  questions.push({question:`What is the primary focus of "${lessonTitle}" in "${moduleTitle}" (${courseTitle})?`, options:[], correct_answer:shortDesc});
  questions.push({question:`In the video for "${lessonTitle}", which concept is correctly associated with the lesson content?`, options:[], correct_answer:truncate(`Understanding ${keyPhrase} — as explained in the lesson video for ${lessonTitle}.`,200)});
  questions.push({question:`Which task best reflects what you practice in "${lessonTitle}" (${duration} min lesson)?`, options:[], correct_answer:truncate(`Apply ${lowerKey} to solve a hands-on exercise from ${moduleTitle} (covered in ${duration} min).`,200)});
  questions.push({question:`Which statement correctly describes "${lessonTitle}" as taught in ${courseTitle} (${level})?`, options:[], correct_answer:truncate(`This ${level}-level lesson in ${category} explains ${lowerKey} with examples shown in the video.`,200)});
  questions.push({question:`What common mistake should you avoid when working with concepts from "${lessonTitle}"?`, options:[], correct_answer:truncate(`Confusing ${lessonTitle.toLowerCase()} with unrelated ${category.toLowerCase()} concepts not covered in this video.`,200)});
  const filled=questions.map((q,idx)=>{
    let opts:string[]=[]; let correct=q.correct_answer;
    if(idx===0) opts=[correct, distracts[0]||defaultDistractors[0], distracts[1]||defaultDistractors[1], distracts[2]||defaultDistractors[2]];
    else if(idx===1) opts=[correct, `Using ${distracts[0].toLowerCase()} is the main idea of ${lessonTitle}.`, `The video claims ${lessonTitle} is unrelated to ${category}.`, `The lesson skips ${keyPhrase.toLowerCase()} entirely.`];
    else if(idx===2) opts=[correct, `Memorizing ${lessonTitle} without practicing the video demo.`, `Only reading slides and ignoring the ${duration} min walkthrough.`, `Copying code without understanding ${lowerKey}.`];
    else if(idx===3) opts=[correct, `The video states ${lessonTitle} has no relation to ${moduleTitle}.`, `This lesson is optional and never assessed in ${courseTitle}.`, `${lessonTitle} contradicts all principles of ${category}.`];
    else opts=[correct, `Skipping video timestamps and guessing answers randomly.`, `Assuming ${lessonTitle} is identical to ${distracts[0].toLowerCase()}.`, `Rushing through without noting the key steps shown at ${Math.floor(duration/2)}:00.`];
    opts=opts.map(o=>truncate(o,240)); correct=truncate(correct,240);
    const seed=hashString(row.lesson_id+'|'+idx);
    const shuffled=shuffleOptions(opts,seed);
    const uniq=Array.from(new Set(shuffled));
    while(uniq.length<4) uniq.push(`Alternative approach ${uniq.length} for ${lessonTitle}`.slice(0,120));
    return {question:q.question, options:uniq.slice(0,4), correct_answer:correct, points:1, order_index:idx};
  });
  return filled;
}
async function withRetry<T>(fn:()=>Promise<T>, label:string, maxRetries=8, delayMs=3500):Promise<T>{
  for(let attempt=1; attempt<=maxRetries; attempt++){
    try{ const res=await fn(); if(attempt>1) console.log(`✅ ${label} succeeded on attempt ${attempt}`); return res;
    }catch(e:any){
      const msg=e.message||String(e);
      const isConn=msg.toLowerCase().includes('etimedout')||msg.toLowerCase().includes('enetunreach')||msg.toLowerCase().includes('connect')||msg.toLowerCase().includes('timeout');
      console.warn(`⚠️ ${label} attempt ${attempt}/${maxRetries} failed: ${msg.slice(0,120)} ${isConn?'(connection)':''}`);
      if(attempt===maxRetries) throw e;
      if(isConn){ try{ db.resetPool(); }catch{} }
      await new Promise(r=>setTimeout(r,delayMs));
    }
  } throw new Error(`Failed ${label} after retries`);
}
function buildInsert(table:string, columns:string[], rows:any[][], returning?:string){
  // rows: array of value arrays
  if(rows.length===0) return null;
  let placeholderIdx=1;
  const valuesClauses:string[]=[];
  const params:any[]=[];
  for(const row of rows){
    const placeholders=row.map(()=>`$${placeholderIdx++}`);
    valuesClauses.push(`(${placeholders.join(',')})`);
    params.push(...row);
  }
  const sql=`INSERT INTO ${table} (${columns.join(',')}) VALUES ${valuesClauses.join(',')} ${returning?`RETURNING ${returning}`:''}`;
  return {sql, params};
}
async function main(){
  const query=db.query; const getClient=db.getClient;
  console.log('🔍 Connecting to DB (warming pool)...'); const startAll=Date.now();
  await withRetry(()=>query('SELECT 1 as warm'),'warmup',10,2000).catch(e=>{ console.warn('Warmup final fail:', e.message?.slice(0,100)); });
  try{
    const beforeQ=await withRetry(()=>query('SELECT count(*)::int as total FROM quizzes'),'count quizzes');
    const beforeQQ=await withRetry(()=>query('SELECT count(*)::int as total FROM quiz_questions'),'count quiz_questions');
    const beforeAtt=await withRetry(()=>query('SELECT count(*)::int as total FROM quiz_attempts'),'count attempts');
    console.log(`Before: quizzes=${beforeQ.rows[0].total}, questions=${beforeQQ.rows[0].total}, attempts=${beforeAtt.rows[0].total}`);
  }catch(e:any){ console.warn('Could not fetch before counts:', e.message); }
  console.log('📚 Fetching lessons with curriculum...');
  const {rows: lessons}=await withRetry(()=>query<LessonRow>(`
    SELECT l.id as lesson_id, l.title as lesson_title, l.description as lesson_description, l.duration as lesson_duration, l.order_index as lesson_order, l.course_id, l.module_id, m.title as module_title, c.title as course_title, c.category as course_category, c.level as course_level
    FROM lessons l LEFT JOIN modules m ON l.module_id=m.id JOIN courses c ON l.course_id=c.id
    ORDER BY c.created_at ASC, m.order_index NULLS LAST, l.order_index ASC, l.created_at ASC
  `),'fetch lessons', 15, 4000);
  console.log(`Found ${lessons.length} lessons across courses`);
  if(lessons.length===0){ console.error('No lessons'); process.exit(1); }
  const {rows: courses}=await withRetry(()=>query('SELECT id, title FROM courses'),'fetch courses');
  console.log(`Courses: ${courses.length}`);
  const client:any = await withRetry(async()=>{ const c=await getClient(); await c.query('SELECT 1'); return c; }, 'acquire client');
  try{
    console.log('🗑️ Overwriting quizzes (transaction BEGIN)...');
    await client.query('BEGIN');
    const delAttempts=await client.query('DELETE FROM quiz_attempts'); console.log(`  Deleted quiz_attempts: ${delAttempts.rowCount}`);
    const delQuestions=await client.query('DELETE FROM quiz_questions'); console.log(`  Deleted quiz_questions: ${delQuestions.rowCount}`);
    const delQuizzes=await client.query('DELETE FROM quizzes'); console.log(`  Deleted quizzes: ${delQuizzes.rowCount}`);
    // Batch insert quizzes
    console.log('🚀 Batch inserting quizzes...');
    const quizColumns=['course_id','lesson_id','title','description','time_limit','passing_score','max_attempts','published'];
    const quizRows = lessons.map(r=>[
      r.course_id, r.lesson_id,
      `${r.lesson_title} - Quiz`,
      `Quiz for "${r.lesson_title}" (${r.module_title||'General'} — ${r.course_title}). Tests understanding of the ${safeDuration(r.lesson_duration)} min video: ${truncate(r.lesson_description,300)}`,
      10,70,3,true
    ]);
    const QUIZ_BATCH=100;
    const quizIdByLesson=new Map<string,string>();
    for(let i=0;i<quizRows.length;i+=QUIZ_BATCH){
      const batch=quizRows.slice(i,i+QUIZ_BATCH);
      const batchLessons=lessons.slice(i,i+QUIZ_BATCH);
      const built=buildInsert('quizzes', quizColumns, batch, 'id, lesson_id');
      if(!built) continue;
      const res=await withRetry(()=>client.query(built.sql, built.params), `insert quizzes batch ${i/QUIZ_BATCH+1}`);
      // res.rows contains id, lesson_id — use to map
      for(const row of res.rows){
        quizIdByLesson.set(row.lesson_id, row.id);
      }
      // Fallback: if RETURNING not matched due to ordering, use batchLessons order
      if(res.rows.length !== batch.length){
        console.warn(`  Batch ${i/QUIZ_BATCH+1}: expected ${batch.length} ids got ${res.rows.length}, fallback ordering`);
        // map by index if lesson_id missing? but we already mapped
      }
      console.log(`  Quiz batch ${Math.floor(i/QUIZ_BATCH)+1}/${Math.ceil(quizRows.length/QUIZ_BATCH)}: ${res.rows.length} inserted`);
    }
    console.log(`  Total quizzes mapped: ${quizIdByLesson.size}`);
    // Generate all questions
    console.log('📝 Generating questions...');
    const allQuestions: any[][] = []; // each as [quiz_id, question, optionsJson, correct, points, order_index]
    for(const lesson of lessons){
      const qid=quizIdByLesson.get(lesson.lesson_id);
      if(!qid){ console.warn(`  No quizId for lesson ${lesson.lesson_id} ${lesson.lesson_title}`); continue; }
      const qs=generateQuestionsForLesson(lesson);
      for(const q of qs){
        allQuestions.push([qid, q.question, JSON.stringify(q.options), q.correct_answer, q.points, q.order_index]);
      }
    }
    console.log(`  Generated ${allQuestions.length} questions (expected ${lessons.length*5})`);
    // Batch insert questions
    console.log('🚀 Batch inserting questions...');
    const qCols=['quiz_id','question','options','correct_answer','points','order_index'];
    const Q_BATCH=200; // 200*6=1200 params
    let qInserted=0;
    for(let i=0;i<allQuestions.length;i+=Q_BATCH){
      const batch=allQuestions.slice(i,i+Q_BATCH);
      const built=buildInsert('quiz_questions', qCols, batch);
      if(!built) continue;
      const res=await withRetry(()=>client.query(built.sql, built.params), `insert questions batch ${i/Q_BATCH+1}`);
      qInserted+=res.rowCount||batch.length;
      if(((i/Q_BATCH)+1)%5===0 || i+Q_BATCH>=allQuestions.length){
        console.log(`  Questions batch ${Math.floor(i/Q_BATCH)+1}/${Math.ceil(allQuestions.length/Q_BATCH)}: ${res.rowCount} inserted (total ${qInserted})`);
      }
    }
    await client.query('COMMIT');
    console.log(`✅ COMMITTED in ${((Date.now()-startAll)/1000).toFixed(1)}s. Quizzes ${quizIdByLesson.size}, Questions ${qInserted}`);
  }catch(e:any){
    await client.query('ROLLBACK').catch(()=>{});
    console.error('❌ ROLLED BACK:', e);
    process.exit(1);
  }finally{ client.release(); }
  try{
    const afterQ=await withRetry(()=>query('SELECT count(*)::int as total FROM quizzes'),'verify quizzes');
    const afterQQ=await withRetry(()=>query('SELECT count(*)::int as total FROM quiz_questions'),'verify questions');
    const perQuizBad=await withRetry(()=>query(`SELECT count(*)::int as bad FROM (SELECT quiz_id, count(*) as c FROM quiz_questions GROUP BY quiz_id HAVING count(*) !=5) s`),'verify perQuiz');
    console.log(`After: quizzes=${afterQ.rows[0].total}, questions=${afterQQ.rows[0].total}, bad(≠5)=${perQuizBad.rows[0].bad}`);
    const sample=await withRetry(()=>query(`
      SELECT q.title as quiz_title, c.title as course, l.title as lesson, qq.question, qq.correct_answer, qq.options
      FROM quizzes q JOIN courses c ON q.course_id=c.id JOIN lessons l ON q.lesson_id=l.id JOIN quiz_questions qq ON qq.quiz_id=q.id
      ORDER BY q.created_at DESC, qq.order_index ASC LIMIT 5
    `),'sample');
    console.log('Sample:\n', JSON.stringify(sample.rows,null,2));
    const nullCheck=await withRetry(()=>query('SELECT count(*)::int as total FROM quizzes WHERE lesson_id IS NULL'),'null check');
    console.log(`Quizzes with null lesson_id (should be 0): ${nullCheck.rows[0].total}`);
    const lessonQuizCount=await withRetry(()=>query(`SELECT c.title as course, count(*)::int as quizzes FROM quizzes q JOIN courses c ON q.course_id=c.id GROUP BY c.title ORDER BY c.title LIMIT 5`),'course distribution');
    console.log('Per course sample:', JSON.stringify(lessonQuizCount.rows,null,2));
  }catch(e:any){ console.warn('Verification failed:', e.message); }
  console.log('Done');
  process.exit(0);
}
main().catch(e=>{ console.error('Script failed:',e); process.exit(1); });
