import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { CheckCircle2 } from 'lucide-react';

interface ApplyModalProps {
  open: boolean;
  onClose: () => void;
  kind: 'job' | 'internship';
  listing: { id: string; title: string; company?: string | null };
}

export function ApplyModal({ open, onClose, kind, listing }: ApplyModalProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [coverNote, setCoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setCoverNote(''); setDone(false); setError(null); setSubmitting(false); };

  const close = () => { reset(); onClose(); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/career/${kind}s/${listing.id}/apply`, { cover_note: coverNote || undefined });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Application failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={close} title={`Apply to ${listing.title}`}>
      {!isAuthenticated ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Log in to apply. Applications you send are tracked in your personal pipeline.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={() => navigate('/login')}>Log In</Button>
          </div>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-medium">Application sent!</p>
            <p className="text-sm text-gray-500">You can track its progress in your Applications pipeline.</p>
            <Badge variant="success" size="md">Status: Applied</Badge>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => navigate('/student/applications')}>View My Applications</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <p className="text-sm text-gray-500">
            Applying to <span className="text-white font-medium">{listing.title}</span>
            {listing.company ? ` at ${listing.company}` : ''}. A member of our career team will review it.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="cover-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cover note (optional)</label>
            <textarea
              id="cover-note"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              rows={5}
              placeholder="Introduce yourself — what you're learning, your strengths, and why this role fits."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" loading={submitting}>Submit Application</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}