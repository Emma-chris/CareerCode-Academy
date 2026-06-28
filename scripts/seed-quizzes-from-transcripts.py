"""
Seed Quiz Questions from Video Descriptions

Fetches YouTube video descriptions for all lessons with YouTube video URLs,
combines them with lesson/course titles, generates 3 multiple-choice
questions per lesson, and creates a quiz with those questions.

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

COOKIES_PATH = r"C:\Users\DELL\Desktop\CareerCode-Academy-wid\m.youtube.com_cookies.txt"
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


def main():
    start_time = time.time()

    # --- Startup checks ---
    print("=" * 55)
    print("  Quiz Seed Script — YouTube Description Quiz Generator")
    print("=" * 55)
    print()

    cookies_ok = os.path.exists(COOKIES_PATH)
    print(f"  [1/5] Cookies file: {'FOUND' if cookies_ok else 'MISSING!'} ({COOKIES_PATH})")
    if not cookies_ok:
        print("  ERROR: Cookies file not found. Export YouTube cookies first.")
        sys.exit(1)

    print(f"  [2/5] Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    conn.autocommit = True
    cur = conn.cursor()
    print(f"  [2/5] Database connected")

    # --- Step 1: Get all lessons with video URLs ---
    print(f"  [3/5] Querying lessons...")
    cur.execute("""
        SELECT l.id, l.title, l.video_url, l.course_id, c.title as course_title
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        WHERE l.video_url IS NOT NULL AND l.video_url != ''
    """)
    all_lessons = cur.fetchall()
    print(f"  [3/5] Found {len(all_lessons)} lessons with video URLs")

    # --- Step 2: Filter out lessons that already have quizzes ---
    print(f"  [4/5] Filtering existing quizzes...")

    # Batch fetch existing quiz lesson IDs (single query)
    cur.execute("SELECT DISTINCT lesson_id FROM quizzes")
    existing_quiz_lessons = {row[0] for row in cur.fetchall()}
    print(f"  [4/5] Existing quizzes in DB: {len(existing_quiz_lessons)}")

    pending = []
    skipped_existing = 0
    skipped_not_youtube = 0
    total = len(all_lessons)
    for i, (lesson_id, lesson_title, video_url, course_id, course_title) in enumerate(all_lessons, 1):
        if i % 50 == 0 or i == total:
            print(f"\r  [4/5] Scanning: {i}/{total}  ", end='', flush=True)

        youtube_id = extract_youtube_id(video_url)
        if not youtube_id:
            skipped_not_youtube += 1
            continue

        if lesson_id in existing_quiz_lessons:
            skipped_existing += 1
            continue

        pending.append((lesson_id, lesson_title, course_id, course_title, youtube_id))

    print()
    print(f"  [4/5] Skipped (not YouTube): {skipped_not_youtube}")
    print(f"  [4/5] Skipped (existing quiz): {skipped_existing}")
    print(f"  [4/5] Pending: {len(pending)}")
    print()

    # --- Step 3 + 4: Fetch descriptions + insert quizzes incrementally ---
    print(f"  [5/5] Fetching descriptions + creating quizzes (2 workers, {FETCH_DELAY}s interval)...")
    print(f"  {'─' * 50}")
    fetch_errors = {}
    insert_errors = 0
    processed = 0
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_map = {
            executor.submit(fetch_description, yt_id): (lid, ltitle, cid, ctitle, yt_id)
            for lid, ltitle, cid, ctitle, yt_id in pending
        }
        done = 0
        total = len(future_map)
        for future in as_completed(future_map):
            lid, ltitle, cid, ctitle, yt_id = future_map[future]
            done += 1
            text = future.result()
            if not text:
                fetch_errors[yt_id] = ltitle
                print(f"  [{done:>3}/{total}] {yt_id} FAIL  {ltitle[:50]:<50s}")
                sys.stdout.flush()
                continue

            # Insert quiz immediately
            combined_text = f"{ltitle}. {ctitle}. {text}"
            questions = generate_questions(combined_text, count=3)
            if not questions:
                fetch_errors[yt_id] = ltitle
                print(f"  [{done:>3}/{total}] {yt_id} FAIL  {ltitle[:50]:<50s}")
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
                print(f"  [{done:>3}/{total}] {yt_id} OK  {ltitle[:50]:<50s}")
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
            print(f"  [{done:>3}/{total}] {yt_id} OK  {ltitle[:50]:<50s}")
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
    print(f"  Skipped (not YouTube): {skipped_not_youtube}")
    print(f"  Failed (no description): {len(fetch_errors)}")
    print("=" * 55)


if __name__ == '__main__':
    main()
