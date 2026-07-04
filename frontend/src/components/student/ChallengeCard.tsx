import { useState, useEffect } from 'react';
import { Code, FileText, Palette, Image, Briefcase, PenLine } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import SolveChallenge from './SolveChallenge';
import { api } from '@/lib/axios';

interface Submission {
  id: string;
  passed: boolean;
  score: number | null;
  feedback?: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  instructions: string;
  difficulty: string;
  type?: string;
  submission?: Submission;
}

export default function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const [showEditor, setShowEditor] = useState(false);
  const latestSubmission = challenge.submission;
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/challenges/${challenge.id}/submissions`);
        setSubmissions(data.data || []);
      } catch { setSubmissions([]); }
    })();
  }, [challenge.id, refreshing]);

  const typeConfig: Record<string, { icon: any; color: string }> = {
    code: { icon: Code, color: 'text-purple-500 bg-purple-500/10' },
    practical: { icon: FileText, color: 'text-orange-500 bg-orange-500/10' },
    design: { icon: Palette, color: 'text-pink-500 bg-pink-500/10' },
    media: { icon: Image, color: 'text-cyan-500 bg-cyan-500/10' },
    business: { icon: Briefcase, color: 'text-emerald-500 bg-emerald-500/10' },
    essay: { icon: PenLine, color: 'text-amber-500 bg-amber-500/10' },
  };
  const tc = typeConfig[challenge.type || 'code'] || typeConfig.code;
  const TypeIcon = tc.icon;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tc.color}`}>
            <TypeIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-white text-sm font-medium">{challenge.title}</h4>
            <p className="text-gray-400 text-xs mt-0.5">{challenge.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {latestSubmission && (
            <Badge className={latestSubmission.passed ? 'bg-emerald-500/20 text-emerald-400' : latestSubmission.score !== null ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}>
              {latestSubmission.passed ? 'Passed' : latestSubmission.score !== null ? `Graded (${latestSubmission.score}/100)` : 'Failed'}
            </Badge>
          )}
          <Badge className="bg-blue-500/10 text-blue-400 text-[10px]">{challenge.difficulty}</Badge>
          <Badge className="bg-gray-500/10 text-gray-400 text-[10px]">{challenge.type || 'code'}</Badge>
        </div>
      </div>

      <div className="text-xs text-gray-300 mb-3 whitespace-pre-wrap">{challenge.instructions}</div>

      {latestSubmission?.feedback && (
        <div className="text-xs text-gray-400 mb-3 p-2 rounded-lg bg-gray-800/50">
          Feedback: {latestSubmission.feedback}
        </div>
      )}

      {showEditor && (
        <SolveChallenge
          challenge={challenge}
          submission={latestSubmission}
          onSubmitted={() => setRefreshing(r => r + 1)}
        />
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() => setShowEditor(!showEditor)}
      >
        {showEditor ? 'Hide' : latestSubmission ? 'Edit Submission' : 'Solve Challenge'}
      </Button>
    </GlassCard>
  );
}
