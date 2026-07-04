import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Star, StarHalf, MessageCircle, Flag, Send, X, Smile, Meh, Frown } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import SEO from '@/components/seo/SEO';
import { useInstructorStore } from '@/store/instructorStore';
import { cn, getInitials, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function Reviews() {
  const { reviews, isLoading, error, fetchReviews, replyToReview, reportReview } = useInstructorStore();
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const total = reviews.length;
  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = total > 0 ? totalRating / total : 0;
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const repliedCount = reviews.filter(r => r.replied).length;
  const responseRate = total > 0 ? Math.round((repliedCount / total) * 100) : 0;

  const distribution = [0, 0, 0, 0, 0];
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) distribution[5 - r.rating]++;
  });
  const maxDist = Math.max(...distribution, 1);

  const openReply = (review: any) => {
    setSelectedReview(review);
    setReplyText(review.reply || '');
    setReplyModalOpen(true);
  };

  const closeReply = () => {
    setReplyModalOpen(false);
    setSelectedReview(null);
    setReplyText('');
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    setSending(true);
    try {
      await replyToReview(selectedReview.id, replyText.trim());
      toast.success('Reply sent successfully');
      closeReply();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleReport = async (id: string) => {
    try {
      await reportReview(id);
      toast.success('Review reported to administrators');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to report review');
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const classMap = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4' };
    const cls = classMap[size];
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={cn(cls, star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600')}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <SEO title="Reviews & Feedback" description="View and manage student reviews and feedback for your courses." />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Reviews & Feedback</h1>
            <p className="text-gray-500">View and respond to student reviews across your courses.</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-gray-500">Total Reviews</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400 fill-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}</p>
                <p className="text-xs text-gray-500">Average Rating</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Star className="w-5 h-5 text-green-600 dark:text-green-400 fill-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fiveStarCount}</p>
                <p className="text-xs text-gray-500">5-Star Reviews</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{responseRate}%</p>
                <p className="text-xs text-gray-500">Response Rate</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Rating Distribution */}
        {total > 0 && (
          <GlassCard className="p-5 mb-8">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Rating Distribution</h2>
            <div className="space-y-3">
              {distribution.map((count, i) => {
                const starVal = 5 - i;
                const pct = Math.round((count / maxDist) * 100);
                return (
                  <div key={starVal} className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 w-6">{starVal}</span>
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Error State */}
        {error && (
          <GlassCard className="p-8 text-center">
            <Frown className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-500 font-medium mb-1">Failed to load reviews</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchReviews}>Try Again</Button>
          </GlassCard>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <PageSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && total === 0 && (
          <GlassCard className="p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No reviews yet</h3>
            <p className="text-sm text-gray-500">Reviews from your students will appear here once they start leaving feedback.</p>
          </GlassCard>
        )}

        {/* Reviews List */}
        {!isLoading && !error && total > 0 && (
          <div className="space-y-4">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GlassCard hover className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                      {getInitials(review.userName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{review.userName}</h3>
                            <span className="text-xs text-gray-400">{getRelativeTime(review.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            <Badge variant="primary" size="sm">{review.courseTitle}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<MessageCircle className="w-4 h-4" />}
                            onClick={() => openReply(review)}
                            title={review.replied ? 'Edit reply' : 'Reply to review'}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Flag className="w-4 h-4 text-red-400" />}
                            onClick={() => handleReport(review.id)}
                            title="Report abuse"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{review.comment}</p>
                      {review.replied && review.reply && (
                        <div className="mt-3 pl-4 border-l-2 border-blue-400/50">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Your reply:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{review.reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}

        {/* Reply Modal */}
        <AnimatePresence>
          {replyModalOpen && selectedReview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeReply}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    {selectedReview.replied ? 'Edit Reply' : 'Reply to Review'}
                  </h2>
                  <button onClick={closeReply} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-white text-[10px] font-semibold">
                      {getInitials(selectedReview.userName)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedReview.userName}</span>
                    {renderStars(selectedReview.rating, 'sm')}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedReview.comment}</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Your Reply</label>
                  <textarea
                    className="w-full h-32 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                    placeholder="Write your reply to this student..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={closeReply}>Cancel</Button>
                  <Button variant="primary" onClick={handleSubmitReply} disabled={sending || !replyText.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? 'Sending...' : selectedReview.replied ? 'Update Reply' : 'Send Reply'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
