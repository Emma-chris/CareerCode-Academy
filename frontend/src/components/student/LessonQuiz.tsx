import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { HeartsBar } from '@/components/student/HeartsBar';
import {
  Clock, CheckCircle, XCircle, HelpCircle, ArrowLeft, ArrowRight,
  Send, Loader2, RotateCcw, Trophy, AlertCircle,
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[] | string;
  points?: number;
}

interface Quiz {
  id: string;
  title?: string;
  description?: string;
  time_limit?: number;
  passing_score?: number;
  max_attempts?: number;
  questions: Question[];
}

interface QuestionResult {
  questionId: string;
  question: string;
  options: string[] | string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
}

interface SubmitResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  questionResults?: QuestionResult[];
  attemptsUsed: number;
  maxAttempts: number;
  passingScore: number;
}

const normalizeOptions = (options: string[] | string | undefined): string[] => {
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try { return JSON.parse(options); } catch { return []; }
  }
  return [];
};

export default function LessonQuiz({ quiz }: { quiz: Quiz }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [priorPassed, setPriorPassed] = useState(false);
  const [priorScore, setPriorScore] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const maxAttempts = quiz.max_attempts ?? 1;

  useEffect(() => {
    let active = true;
    if (quiz.id) {
      api.get(`/quizzes/${quiz.id}/attempts`)
        .then(({ data }) => {
          if (!active) return;
          const attempt = data.data?.[0];
          if (attempt) {
            setAttemptsUsed(1);
            if (attempt.passed) {
              setPriorPassed(true);
              setPriorScore(Number(attempt.score) || 0);
            }
          }
        })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [quiz.id]);

  useEffect(() => {
    if (result) return () => {};
    if (!quiz.time_limit || quiz.time_limit <= 0) return () => {};
    setTimeLeft(quiz.time_limit * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quiz.id, quiz.time_limit, result]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const handleSubmit = async () => {
    if (!quiz.id) return;
    setSubmitError(null);
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const formatted = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));
      const { data } = await api.post(`/quizzes/${quiz.id}/submit`, { answers: formatted });
      setResult(data.data);
      setAttemptsUsed((n) => n + 1);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Failed to submit quiz. Please try again.');
      setSubmitting(false);
      if (quiz.time_limit && quiz.time_limit > 0) {
        setTimeLeft(quiz.time_limit * 60);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev === null || prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  const resetAttempt = () => {
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setSubmitError(null);
  };

  if (questions.length === 0) {
    return <p className="text-gray-400 text-sm">No questions in this quiz yet.</p>;
  }

  // ---------- Loading / idle quiz header preview ----------
  if (!quiz.id && !result) {
    return <p className="text-gray-400 text-sm">This quiz is not available yet.</p>;
  }

  return (
    <div className="space-y-4">
      {priorPassed && !result && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success-500/10 border border-success-500/30">
          <Trophy className="w-5 h-5 text-success-400 shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-success-400">Quiz passed!</span>
            {priorScore !== null && <span className="text-gray-400"> (Score: {priorScore}%)</span>}
          </div>
        </div>
      )}

      {result && (
        <div className={`p-6 rounded-2xl border text-center ${result.passed ? 'bg-success-500/10 border-success-500/30' : 'bg-danger-500/10 border-danger-500/30'}`}>
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${result.passed ? 'bg-success-500/20' : 'bg-danger-500/20'}`}>
            {result.passed ? <CheckCircle className="w-8 h-8 text-success-400" /> : <XCircle className="w-8 h-8 text-danger-400" />}
          </div>
          <h3 className="text-lg font-bold mb-1">{result.passed ? 'Congratulations!' : 'Not this time'}</h3>
          <p className="text-sm text-gray-400 mb-4">{result.passed ? 'You passed the quiz!' : `Keep studying and try again (pass mark: ${result.passingScore}%).`}</p>
          <div className="grid grid-cols-3 gap-3 mb-5 max-w-md mx-auto">
            <div className="bg-gray-800/60 rounded-xl p-3">
              <p className="text-xl font-bold text-primary-400">{result.score}%</p>
              <p className="text-xs text-gray-400">Your Score</p>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-3">
              <p className="text-xl font-bold text-white">{Math.round(result.correctCount)}/{result.totalQuestions}</p>
              <p className="text-xs text-gray-400">Correct</p>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-3">
              <p className={`text-xl font-bold ${result.passed ? 'text-success-400' : 'text-danger-400'}`}>{result.passed ? 'Passed' : 'Failed'}</p>
              <p className="text-xs text-gray-400">Status</p>
            </div>
          </div>
          {attemptsUsed < maxAttempts && (
            <Button variant="primary" onClick={resetAttempt}>
              <RotateCcw className="w-4 h-4 mr-1" /> Retry Quiz
            </Button>
          )}
        </div>
      )}

      {result && result.questionResults && (
        <div className="p-5 rounded-2xl bg-gray-800/40 border border-gray-700/50 space-y-3">
          <h4 className="font-semibold flex items-center gap-2"><HelpCircle className="w-4 h-4 text-primary-400" /> Review Answers</h4>
          {result.questionResults.map((r, idx) => {
            const options = normalizeOptions(r.options);
            return (
              <div key={r.questionId || idx} className={`p-4 rounded-xl border ${r.isCorrect ? 'border-success-500/30 bg-success-500/5' : 'border-danger-500/30 bg-danger-500/5'}`}>
                <p className="text-sm font-medium mb-2">
                  <span className={r.isCorrect ? 'text-success-400' : 'text-danger-400'}>Q{idx + 1}.</span> {r.question}
                </p>
                <div className="space-y-1">
                  {options.map((opt, oi) => {
                    const isSelected = r.userAnswer === opt;
                    const isCorrectOpt = opt === r.correctAnswer;
                    return (
                      <div key={oi} className={`text-sm px-3 py-1.5 rounded-lg ${isCorrectOpt ? 'bg-success-500/10 text-success-400 font-medium' : isSelected && !isCorrectOpt ? 'bg-danger-500/10 text-danger-400' : 'bg-gray-800/60 text-gray-400'}`}>
                        {String.fromCharCode(65 + oi)}. {opt}
                        {isCorrectOpt && <CheckCircle className="w-3 h-3 inline ml-1 text-success-400" />}
                        {isSelected && !isCorrectOpt && <XCircle className="w-3 h-3 inline ml-1 text-danger-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!result && (
        <>
          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/30">
              <AlertCircle className="w-5 h-5 text-danger-400 shrink-0" />
              <span className="text-sm text-danger-400">{submitError}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {attemptsUsed > 0
                ? `Attempt ${Math.min(attemptsUsed, maxAttempts)}/${maxAttempts}`
                : `${maxAttempts} attempt${maxAttempts > 1 ? 's' : ''} allowed`}
            </span>
            <HeartsBar hearts={5} maxHearts={5} nextHeartIn={null} />
          </div>

          <div className="p-4 rounded-2xl bg-gray-800/40 border border-gray-700/50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold">{quiz.title || 'Lesson Quiz'}</h3>
                {quiz.description && <p className="text-sm text-gray-400 mt-0.5">{quiz.description}</p>}
              </div>
              {timeLeft !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${timeLeft < 60 ? 'bg-danger-500/10 text-danger-400 animate-pulse' : 'bg-gray-900 text-gray-300'}`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                <span>{answeredCount} of {totalQuestions} answered</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {totalQuestions > 0 && (
            <div className="p-6 rounded-2xl bg-gray-800/40 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-full">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                {questions[currentIndex].points && (
                  <span className="text-xs text-gray-400">{questions[currentIndex].points} point{questions[currentIndex].points > 1 ? 's' : ''}</span>
                )}
              </div>
              <h4 className="font-medium mb-5">{questions[currentIndex].question}</h4>
              <div className="space-y-2.5">
                {normalizeOptions(questions[currentIndex].options).map((opt, oi) => {
                  const qid = questions[currentIndex].id;
                  const selected = answers[qid] === opt;
                  return (
                    <button
                      key={oi}
                      onClick={() => setAnswers({ ...answers, [qid]: opt })}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                        selected
                          ? 'border-primary-500 bg-primary-500/10 text-primary-300 font-medium'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }`}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span> {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {totalQuestions === 0 && !submitting && (
            <div className="p-8 text-center rounded-2xl bg-gray-800/40 border border-gray-700/50">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">This quiz has no questions yet.</p>
            </div>
          )}

          {totalQuestions > 0 && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      idx === currentIndex
                        ? 'bg-primary-500 text-white'
                        : answers[q.id]
                          ? 'bg-primary-500/10 text-primary-400'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              {currentIndex < totalQuestions - 1 ? (
                <Button variant="ghost" onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} disabled={submitting} loading={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  Submit
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}