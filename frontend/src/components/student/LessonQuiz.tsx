import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

interface Question {
  id: string;
  question: string;
  options: string[] | string;
  correct_answer: string;
}

interface Quiz {
  id: string;
  title?: string;
  description?: string;
  questions: Question[];
}

export default function LessonQuiz({ quiz }: { quiz: Quiz }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSubmit = () => {
    const questions = quiz.questions || [];
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setScore(pct);
    setSubmitted(true);
  };

  if (!quiz.questions?.length) {
    return <p className="text-gray-400 text-sm">No questions in this quiz yet.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-white text-sm font-medium">{quiz.title || 'Lesson Quiz'}</h3>
      {quiz.description && (
        <p className="text-gray-300 text-xs">{quiz.description}</p>
      )}

      {quiz.questions.map((q, qi) => {
        const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        const isCorrect = submitted && answers[q.id] === q.correct_answer;
        const isWrong = submitted && answers[q.id] && answers[q.id] !== q.correct_answer;

        return (
          <div key={q.id || qi} className="p-3 rounded-xl bg-gray-800/50 space-y-2">
            <p className="text-sm text-white font-medium">{qi + 1}. {q.question}</p>
            <div className="space-y-1">
              {(Array.isArray(options) ? options : []).map((opt: string, oi: number) => {
                const isSelected = answers[q.id] === opt;
                const isCorrectOpt = submitted && opt === q.correct_answer;
                return (
                  <label
                    key={oi}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                      submitted
                        ? isCorrectOpt
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isWrong && isSelected
                            ? 'bg-red-500/20 text-red-400'
                            : 'text-gray-400'
                        : isSelected
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={isSelected}
                      onChange={() => !submitted && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      disabled={submitted}
                      className="hidden"
                    />
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                      isCorrectOpt ? 'border-emerald-400 bg-emerald-400' :
                      isWrong && isSelected ? 'border-red-400 bg-red-400' :
                      isSelected ? 'border-blue-400 bg-blue-400' : 'border-gray-600'
                    }`} />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {!submitted && (
        <Button onClick={handleSubmit} size="sm">Submit Answers</Button>
      )}
      {submitted && score !== null && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          Score: {score}% {score >= 70 ? '✅ Passed' : '❌ Needs improvement'}
        </div>
      )}
    </div>
  );
}
