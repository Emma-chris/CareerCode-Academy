"""
Seed Quiz Questions from Lesson Scripts (preferred) or Video Descriptions

Preferred source: the authored `lessons.script` JSONB (learning objectives,
key concepts, narration lines, examples, exercise) produced by the lesson
production pipeline. Falls back to fetching YouTube video descriptions ONLY
for legacy lessons that still point at a YouTube URL and have no script.

Usage:
    python scripts/seed-quizzes-from-transcripts.py

Requires:
    pip install psycopg2-binary requests
"""

import os
import re
import sys
import time
import uuid
import json
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

# --- Load .env ---
env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip())

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in backend/.env")
    sys.exit(1)

import psycopg2
import requests

# Cookies file for the legacy YouTube-description fallback. Optional now:
# quizzes prefer the authored lesson script (lessons.script). If the file is
# missing we simply skip lessons that have no script.
COOKIES_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'm.youtube.com_cookies.txt'
)
FETCH_DELAY = 2.0

_fetch_lock = threading.Lock()
_last_fetch = 0.0

# --- YouTube ID extraction ---
YOUTUBE_RE = re.compile(
    r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})'
)

def extract_youtube_id(url: str) -> str | None:
    m = YOUTUBE_RE.search(url)
    if m:
        return m.group(1)
    m2 = re.match(r'^([a-zA-Z0-9_-]{11})$', url.strip())
    return m2.group(1) if m2 else None

# --- Question generation ---
def generate_questions(text: str, count: int = 3) -> list[dict]:
    """Generate MCQs from text using keyword-based extraction."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

    if len(sentences) < count:
        sentences = [s for s in sentences if len(s) > 10]
        if not sentences:
            chunks = [text[i:i+200] for i in range(0, len(text), 200)]
            sentences = chunks

    if len(sentences) < count:
        while len(sentences) < count:
            sentences.append(random.choice(sentences) if sentences else "The video covered important concepts.")

    selected = random.sample(sentences, min(count, len(sentences)))
    questions = []

    for sentence in selected:
        words = [w for w in re.findall(r'\b[A-Za-z]{4,}\b', sentence) if w[0].isupper() or len(w) > 5]
        if not words:
            words = re.findall(r'\b[A-Za-z]{4,}\b', sentence)
        if not words:
            continue

        keyword = random.choice(words)
        question_text = sentence.replace(keyword, '________', 1)
        correct = keyword

        distractors = []
        for s in sentences:
            if s != sentence:
                for w in re.findall(r'\b[A-Za-z]{4,}\b', s):
                    if w.lower() != correct.lower() and w not in distractors:
                        distractors.append(w)
                    if len(distractors) >= 3:
                        break
            if len(distractors) >= 3:
                break

        if len(distractors) < 3:
            fallbacks = ['Concept', 'Method', 'Approach', 'Framework', 'Principle']
            for fb in fallbacks:
                if fb.lower() != correct.lower() and fb not in distractors:
                    distractors.append(fb)
                if len(distractors) >= 3:
                    break

        options = [correct] + distractors[:3]
        random.shuffle(options)

        questions.append({
            'question': question_text[:300],
            'options': options,
            'correct_answer': correct,
            'points': 1,
        })

    while len(questions) < count and len(sentences) > 0:
        s = random.choice(sentences)
        words_in_s = re.findall(r'\b[A-Za-z]{4,}\b', s)
        if len(words_in_s) >= 4:
            kw = random.choice(words_in_s)
            q = s.replace(kw, '________', 1)
            opts = [kw]
            for other in words_in_s:
                if other.lower() != kw.lower() and other not in opts:
                    opts.append(other)
                if len(opts) >= 4:
                    break
            while len(opts) < 4:
                opts.append('None of the above')
            random.shuffle(opts)
            questions.append({
                'question': q[:300],
                'options': opts,
                'correct_answer': kw,
                'points': 1,
            })

    return questions[:count]


def _load_cookies() -> dict:
    """Parse Netscape-format cookies file into a dict."""
    if not os.path.exists(COOKIES_PATH):
        return {}
    cookies = {}
    with open(COOKIES_PATH) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split('\t')
            if len(parts) >= 7:
                name, value = parts[5], parts[6]
                cookies[name] = value
    return cookies


_COOKIES = _load_cookies()


def fetch_description(youtube_id: str) -> str | None:
    global _last_fetch
    with _fetch_lock:
        now = time.time()
        since_last = now - _last_fetch
        if since_last < FETCH_DELAY:
            time.sleep(FETCH_DELAY - since_last)
        _last_fetch = time.time()

    url = f"https://www.youtube.com/watch?v={youtube_id}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

    for attempt in range(2):
        try:
            resp = requests.get(url, headers=headers, cookies=_COOKIES, timeout=20)

            if resp.status_code == 429:
                print(f"\n  [!] 429 on {youtube_id}, retrying...")
                time.sleep(5)
                continue

            if resp.status_code != 200:
                print(f"\n  [!] HTTP {resp.status_code} on {youtube_id}")
                return None

            html = resp.text

            # Try meta description tag first
            m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
            if m:
                desc = m.group(1).strip()
                if desc:
                    return desc

            # Fallback: extract from ytInitialData JSON
            m = re.search(r'ytInitialData\s*=\s*({.*?});\s*</script>', html, re.DOTALL)
            if m:
                try:
                    data = json.loads(m.group(1))
                    desc = data.get('playerOverlays', {}).get('playerOverlayRenderer', {}).get('description', '')
                    if desc:
                        return desc.strip()
                except json.JSONDecodeError:
                    pass

            # Final fallback: extract description from og:description meta
            m = re.search(r'<meta\s+property="og:description"\s+content="([^"]*)"', html)
            if m:
                desc = m.group(1).strip()
                if desc:
                    return desc

            return None

        except requests.exceptions.Timeout:
            if attempt == 0:
                print(f"\n  [!] Timeout on {youtube_id}, retrying...")
                time.sleep(3)
            else:
                return None

        except Exception as e:
            err_name = type(e).__name__
            if attempt == 0:
                print(f"\n  [!] {err_name} on {youtube_id}, retrying...")
                time.sleep(3)
            else:
                return None

    return None


def script_to_text(script, title: str, course: str) -> str:
    """Flatten an authored lesson script (JSONB) into quiz source text."""
    if not script:
        return ''
    parts = [title, course]
    parts.extend(script.get('learning_objectives') or [])
    for kc in script.get('key_concepts') or []:
        if isinstance(kc, dict):
            parts.append(kc.get('detail') or kc.get('title') or '')
        else:
            parts.append(str(kc))
    for scene in script.get('scenes') or []:
        if isinstance(scene, dict):
            parts.append(scene.get('narration') or '')
    parts.extend(script.get('examples') or [])
    if script.get('exercise'):
        parts.append(str(script.get('exercise')))
    return '. '.join(str(p).strip() for p in parts if str(p).strip())


def main():
    start_time = time.time()

    # --- Startup checks ---
    print("=" * 55)
    print("  Quiz Seed Script — YouTube Description Quiz Generator")
    print("=" * 55)
    print()

    cookies_ok = os.path.exists(COOKIES_PATH)
    print(f"  [1/5] Cookies file: {'FOUND (legacy fallback only)' if cookies_ok else 'MISSING (OK — scripts preferred)'} ({COOKIES_PATH})")

    print(f"  [2/5] Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    conn.autocommit = True
    cur = conn.cursor()
    print(f"  [2/5] Database connected")

    # --- Step 1: lessons with an authored script OR a legacy YouTube URL ---
    print(f"  [3/5] Querying lessons...")
    cur.execute("""
        SELECT l.id, l.title, l.video_url, l.course_id, c.title as course_title, l.script
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        WHERE l.script IS NOT NULL
           OR (l.video_url IS NOT NULL AND l.video_url != '')
    """)
    all_lessons = cur.fetchall()
    print(f"  [3/5] Found {len(all_lessons)} lessons with scripts or video URLs")

    # --- Step 2: Filter out lessons that already have quizzes ---
    print(f"  [4/5] Filtering existing quizzes...")

    # Batch fetch existing quiz lesson IDs (single query)
    cur.execute("SELECT DISTINCT lesson_id FROM quizzes")
    existing_quiz_lessons = {row[0] for row in cur.fetchall()}
    print(f"  [4/5] Existing quizzes in DB: {len(existing_quiz_lessons)}")

    pending = []
    skipped_existing = 0
    skipped_none = 0
    total = len(all_lessons)
    for i, (lesson_id, lesson_title, video_url, course_id, course_title, script) in enumerate(all_lessons, 1):
        if i % 50 == 0 or i == total:
            print(f"\r  [4/5] Scanning: {i}/{total}  ", end='', flush=True)

        if lesson_id in existing_quiz_lessons:
            skipped_existing += 1
            continue

        script_text = script_to_text(script, lesson_title, course_title) if script else ''
        yt_id = extract_youtube_id(video_url) if video_url else None

        if not script_text and not yt_id:
            skipped_none += 1
            continue

        pending.append((lesson_id, lesson_title, course_id, course_title, yt_id, script_text))

    print()
    print(f"  [4/5] Skipped (no script, no YouTube): {skipped_none}")
    print(f"  [4/5] Skipped (existing quiz): {skipped_existing}")
    print(f"  [4/5] Pending: {len(pending)}")
    print()

    # --- Step 3 + 4: Build source text (scripts preferred, else descriptions) + insert ---
    print(f"  [5/5] Creating quizzes (scripts preferred; descriptions fetched for legacy only)...")
    print(f"  {'─' * 50}")
    fetch_errors = {}
    insert_errors = 0
    processed = 0
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_map = {}
        for lid, ltitle, cid, ctitle, yt_id, script_text in pending:
            if yt_id and not script_text:
                future = executor.submit(fetch_description, yt_id)
            else:
                future = executor.submit(lambda t=script_text: t)
            future_map[future] = (lid, ltitle, cid, ctitle, yt_id, script_text)

        done = 0
        total = len(future_map)
        for future in as_completed(future_map):
            lid, ltitle, cid, ctitle, yt_id, script_text = future_map[future]
            done += 1
            text = future.result()
            source_tag = yt_id if yt_id else 'script'
            if not text and script_text:
                text = script_text
            if not text:
                fetch_errors[source_tag] = ltitle
                print(f"  [{done:>3}/{total}] {source_tag} FAIL  {ltitle[:50]:<50s}")
                sys.stdout.flush()
                continue

            # Insert quiz immediately
            combined_text = f"{ltitle}. {ctitle}. {text}"
            questions = generate_questions(combined_text, count=3)
            if not questions:
                fetch_errors[source_tag] = ltitle
                print(f"  [{done:>3}/{total}] {source_tag} FAIL  {ltitle[:50]:<50s}")
                sys.stdout.flush()
                continue

            quiz_id = str(uuid.uuid4())
            quiz_title = f"{ltitle} — Quiz"
            try:
                cur.execute(
                    """INSERT INTO quizzes (id, course_id, lesson_id, title, description, time_limit, passing_score, max_attempts, published)
                       VALUES (%s, %s, %s, %s, %s, 0, 70, 0, true)""",
                    (quiz_id, cid, lid, quiz_title, f"Auto-generated quiz for {ltitle}")
                )
            except Exception as e:
                print(f"\n  [!] DB error creating quiz for {ltitle}: {e}")
                insert_errors += 1
                print(f"  [{done:>3}/{total}] {source_tag} OK  {ltitle[:50]:<50s}")
                sys.stdout.flush()
                continue

            for i, q in enumerate(questions):
                qid = str(uuid.uuid4())
                try:
                    cur.execute(
                        """INSERT INTO quiz_questions (id, quiz_id, question, options, correct_answer, points, order_index)
                           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                        (qid, quiz_id, q['question'], json.dumps(q['options']), q['correct_answer'], q['points'], i)
                    )
                except Exception as e:
                    print(f"\n  [!] DB error inserting question {i} for {ltitle}: {e}")

            processed += 1
            print(f"  [{done:>3}/{total}] {source_tag} OK  {ltitle[:50]:<50s}")
            sys.stdout.flush()

    print(f"  {'─' * 50}")
    print(f"  Result: {processed} created, {insert_errors} insert err, {len(fetch_errors)} fetch fail")
    print()

    cur.close()
    conn.close()

    elapsed = time.time() - start_time
    mins, secs = divmod(int(elapsed), 60)

    print()
    print("=" * 55)
    print(f"  Done! ({mins}m {secs}s)")
    print(f"  Quizzes created: {processed}")
    print(f"  Insert errors: {insert_errors}")
    print(f"  Skipped (existing quiz): {skipped_existing}")
    print(f"  Skipped (no script, no YouTube): {skipped_none}")
    print(f"  Failed (no source text): {len(fetch_errors)}")
    print("=" * 55)


if __name__ == '__main__':
    main()
