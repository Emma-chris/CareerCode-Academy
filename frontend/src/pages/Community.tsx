import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Users, Eye, Clock, Plus, Loader } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  likes_count: number;
  pinned: boolean;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
  reply_count: number;
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

export default function Community() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', category: 'General', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchDiscussions();
  }, [activeCategory, search]);

  async function fetchCategories() {
    try {
      const { data } = await api.get('/discussions/categories');
      if (data.data && data.data.length > 0) {
        setCategories(data.data);
      }
    } catch {
      // fallback to empty — categories still work
    }
  }

  async function fetchDiscussions() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeCategory !== 'All') params.category = activeCategory;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/discussions', { params });
      setDiscussions(data.data || []);
    } catch {
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      fetchDiscussions();
    }, 300);
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/discussions', newForm);
      toast.success('Discussion created!');
      setShowNew(false);
      setNewForm({ title: '', category: 'General', content: '' });
      fetchDiscussions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create discussion');
    } finally {
      setSubmitting(false);
    }
  }

  const allCategories = ['All', ...new Set([...categories, ...discussions.map(d => d.category)])];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-2">
                Community <span className="gradient-text">Forums</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Join the conversation with fellow developers.
              </p>
            </div>
            {isAuthenticated && (
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>
                New Discussion
              </Button>
            )}
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-8">
            {allCategories.map((cat) => {
              const count =
                cat === 'All'
                  ? discussions.length
                  : discussions.filter((d) => d.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="mb-6">
            <Input
              placeholder="Search discussions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') fetchDiscussions();
              }}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {discussions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No discussions found.</p>
              ) : (
                discussions.map((topic, i) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <GlassCard hover className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/community/${topic.id}`}
                            className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-500 transition-colors block mb-2"
                          >
                            {topic.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {topic.user_name}
                            </span>
                            <Badge variant="primary" size="sm">
                              {topic.category}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {timeAgo(topic.created_at)}
                            </span>
                          </div>
                          {topic.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {topic.tags.map((tag) => (
                                <Badge key={tag} variant="default" size="sm">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" /> {topic.reply_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" /> {topic.views}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <Modal isOpen={showNew} onClose={() => setShowNew(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-6">New Discussion</h2>
          <div className="space-y-4">
            <Input
              label="Title"
              placeholder="What's on your mind?"
              value={newForm.title}
              onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Category</label>
              <select
                value={newForm.category}
                onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5"
              >
                {allCategories.filter((c) => c !== 'All').map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Content</label>
              <textarea
                rows={5}
                placeholder="Write your discussion content..."
                value={newForm.content}
                onChange={(e) => setNewForm({ ...newForm, content: e.target.value })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!newForm.title || submitting}
              >
                {submitting ? 'Posting...' : 'Post Discussion'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
