import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Pin, PinOff, Reply, Clock, X, Send, Search } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { useInstructorStore, Discussion } from '@/store/instructorStore';
import SEO from '@/components/seo/SEO';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.max(0, now - date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function InstructorDiscussions() {
  const { discussions, myCourses, fetchDiscussions, fetchMyCourses, pinDiscussion, isLoading } = useInstructorStore();
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [replyText, setReplyText] = useState('');
  const [pinning, setPinning] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscussions();
    if (myCourses.length === 0) fetchMyCourses();
  }, []);

  const courseOptions = [
    { value: 'all', label: 'All Courses' },
    ...myCourses.map((c) => ({ value: c.id, label: c.title })),
  ];

  const filtered = discussions
    .filter((d) => courseFilter === 'all' || d.courseId === courseFilter)
    .filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

  const handlePinToggle = async (d: Discussion) => {
    setPinning(d.id);
    try {
      await pinDiscussion(d.id, !d.isPinned);
      toast.success(d.isPinned ? 'Discussion unpinned' : 'Discussion pinned');
    } catch {
      toast.error('Failed to update pin status');
    } finally {
      setPinning(null);
    }
  };

  const [replies, setReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  useEffect(() => {
    if (!selectedDiscussion) return;
    (async () => {
      setRepliesLoading(true);
      try {
        const { data } = await (await import('@/lib/axios')).default.get(`/discussions/${selectedDiscussion.id}`);
        // backend returns discussion with replies? try both
        const disc = data.data || data;
        if (disc.replies) setReplies(disc.replies);
        else {
          const { data: rData } = await (await import('@/lib/axios')).default.get(`/discussions/${selectedDiscussion.id}/replies`).catch(() => ({ data: { data: [] } }));
          setReplies(rData.data || rData || []);
        }
      } catch {
        setReplies([]);
      } finally {
        setRepliesLoading(false);
      }
    })();
  }, [selectedDiscussion]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedDiscussion) return;
    try {
      await (await import('@/lib/axios')).default.post(`/discussions/${selectedDiscussion.id}/replies`, { content: replyText.trim() });
      toast.success('Reply posted');
      setReplyText('');
      // reload replies
      const { data } = await (await import('@/lib/axios')).default.get(`/discussions/${selectedDiscussion.id}`);
      const disc = data.data || data;
      if (disc.replies) setReplies(disc.replies);
    } catch {
      toast.error('Failed to post reply');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SEO title="Discussions" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Discussions</h1>
          <p className="text-gray-500">Manage Q&A and discussion threads across your courses.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex-1 w-full sm:w-auto">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search discussions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-64">
          <Select options={courseOptions} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <MessageCircle className="w-16 h-16 mb-4 stroke-1" />
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No discussions yet</p>
          <p className="text-sm mt-1">Discussions from students will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <GlassCard
                hover
                className={cn('p-5 cursor-pointer', d.isPinned && 'ring-1 ring-amber-400/40')}
                onClick={() => setSelectedDiscussion(d)}
              >
                <div className="flex items-start gap-4">
                  {d.isPinned && (
                    <div className="mt-0.5 flex-shrink-0">
                      <Pin className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {d.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{d.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {d.authorName} &middot; <Clock className="w-3 h-3 inline align-text-top" /> {timeAgo(d.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="primary" size="sm">{d.courseTitle}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={pinning === d.id ? undefined : d.isPinned ? <PinOff className="w-4 h-4 text-amber-500" /> : <Pin className="w-4 h-4" />}
                          loading={pinning === d.id}
                          onClick={(e) => { e.stopPropagation(); handlePinToggle(d); }}
                          title={d.isPinned ? 'Unpin' : 'Pin'}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Reply className="w-3 h-3" /> {d.repliesCount} replies</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last activity {timeAgo(d.lastActivity)}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedDiscussion && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDiscussion(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] mx-0 sm:mx-4 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedDiscussion.isPinned && <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                  <h2 className="font-bold text-lg truncate">{selectedDiscussion.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedDiscussion(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {selectedDiscussion.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{selectedDiscussion.authorName}</span>
                      <Badge variant="primary" size="sm">{selectedDiscussion.courseTitle}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{timeAgo(selectedDiscussion.createdAt)}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedDiscussion.content}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {replies.length || selectedDiscussion.repliesCount} { (replies.length || selectedDiscussion.repliesCount) === 1 ? 'Reply' : 'Replies'}
                </p>
                {repliesLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Loading replies...</p>
                ) : replies.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No replies yet. Be the first to respond.</p>
                ) : (
                  replies.map((r: any) => (
                    <div key={r.id || r._id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {(r.authorName || r.user_name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{r.authorName || r.user_name || 'User'}</span>
                          <span className="text-xs text-gray-400">{timeAgo(r.createdAt || r.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 break-words">{r.content || r.message || ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-800">
                <Input
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
