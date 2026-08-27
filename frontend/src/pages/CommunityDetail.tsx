import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader, MessageSquare, Eye, Clock, Send, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Reply {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
}

interface DiscussionDetail {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  likes_count: number;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  reply_count: number;
  replies: Reply[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchDiscussion();
  }, [id]);

  async function fetchDiscussion() {
    setLoading(true);
    try {
      const { data } = await api.get(`/discussions/${id}`);
      setDiscussion(data.data);
    } catch {
      toast.error('Failed to load discussion');
    } finally {
      setLoading(false);
    }
  }

  async function handleReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/discussions/${id}/replies`, { content: replyText });
      toast.success('Reply posted!');
      setReplyText('');
      fetchDiscussion();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReply(replyId: string) {
    try {
      await api.delete(`/discussions/replies/${replyId}`);
      toast.success('Reply deleted');
      fetchDiscussion();
    } catch {
      toast.error('Failed to delete reply');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Discussion not found.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Link
            to="/community"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-500 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Community
          </Link>

          <GlassCard className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold">{discussion.title}</h1>
              <Badge variant="primary" size="sm" className="w-fit sm:w-auto">{discussion.category}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-4">
              <span>{discussion.user_name}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(discussion.created_at)}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {discussion.views} views</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {discussion.reply_count} replies</span>
            </div>

            {discussion.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {discussion.tags.map((tag) => (
                  <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                ))}
              </div>
            )}

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{discussion.content}</p>
            </div>
          </GlassCard>

          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold">Replies ({discussion.replies.length})</h2>
            {discussion.replies.length === 0 ? (
              <p className="text-gray-500 text-sm">No replies yet. Be the first to respond!</p>
            ) : (
              discussion.replies.map((reply) => (
                <GlassCard key={reply.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span className="font-medium">{reply.user_name}</span>
                        <span className="text-gray-400 text-xs">{timeAgo(reply.created_at)}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                        {reply.content}
                      </p>
                    </div>
                    {user && (user.id === reply.user_id || user.role === 'admin') && (
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Delete reply"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          {isAuthenticated ? (
            <GlassCard className="p-4">
              <h3 className="text-sm font-medium mb-3">Post a Reply</h3>
              <textarea
                rows={3}
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm mb-3"
              />
              <div className="flex justify-end">
                <Button
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleReply}
                  disabled={!replyText.trim() || submitting}
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </GlassCard>
          ) : (
            <p className="text-center text-gray-500 text-sm">
              <Link to="/login" className="text-primary-500 hover:underline">Log in</Link> to post a reply.
            </p>
          )}
        </div>
      </section>
    </motion.div>
  );
}
