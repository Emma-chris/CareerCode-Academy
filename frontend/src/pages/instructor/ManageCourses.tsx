import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Globe, BookOpen, Users, Star, Search, Megaphone,
  Send, X, LayoutGrid, List, Copy, Archive, DollarSign, AlertCircle, Clock
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import SEO from '@/components/seo/SEO';
import { useInstructorStore } from '@/store/instructorStore';
import api from '@/lib/axios';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'archived', label: 'Archived' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function ManageCourses() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const {
    myCourses, isLoading, error, fetchMyCourses,
    deleteCourse, publishCourse, unpublishCourse, archiveCourse, duplicateCourse,
  } = useInstructorStore();
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<any | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    fetchMyCourses();
  }, [fetchMyCourses]);

  const filtered = myCourses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    switch (activeTab) {
      case 'published': return c.published;
      case 'draft': return !c.published;
      case 'pending':
      case 'archived': return false;
      default: return true;
    }
  });

  const handlePublishToggle = async (course: any) => {
    try {
      if (course.published) {
        await unpublishCourse(course.id);
        toast.success('Course unpublished');
      } else {
        await publishCourse(course.id);
        toast.success('Course published');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update course');
    }
  };

  const handleArchive = async (course: any) => {
    if (!window.confirm(`Are you sure you want to archive "${course.title}"?`)) return;
    try {
      await archiveCourse(course.id);
      toast.success('Course archived');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to archive course');
    }
  };

  const handleDuplicate = async (course: any) => {
    try {
      await duplicateCourse(course.id);
      toast.success('Course duplicated successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to duplicate course');
    }
  };

  const handleDelete = async (course: any) => {
    if (!window.confirm(`Are you sure you want to delete "${course.title}"? This cannot be undone.`)) return;
    try {
      await deleteCourse(course.id);
      toast.success('Course deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete course');
    }
  };

  const openBroadcast = (target: any | null) => {
    setBroadcastTarget(target);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setBroadcastOpen(true);
  };

  const closeBroadcast = () => {
    setBroadcastOpen(false);
    setBroadcastTarget(null);
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setSending(true);
    try {
      const courseIds = broadcastTarget ? [broadcastTarget.id] : myCourses.map((c) => c.id);
      const { data } = await api.post('/instructor/broadcast', {
        courseIds,
        title: broadcastTitle,
        message: broadcastMessage,
      });
      if (data.success) {
        toast.success(data.message);
        closeBroadcast();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (published: boolean) => (
    <Badge variant={published ? 'success' : 'warning'} size="sm">
      {published ? 'Published' : 'Draft'}
    </Badge>
  );

  const columns: Column<any>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (course) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[220px]">{course.title}</p>
            <p className="text-xs text-gray-500 truncate max-w-[220px]">{course.category} &middot; {course.level}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (course) => statusBadge(course.published),
    },
    {
      key: 'enrollments',
      label: 'Enrollments',
      render: (course) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{course.enrollmentCount || 0}</span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (course) => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          <span className="text-sm">{course.averageRating ? course.averageRating.toFixed(1) : 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (course) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {course.price ? formatCurrency(course.price) : '—'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      render: (course) => (
        <span className="text-sm text-gray-500">{formatDate(course.updated_at || course.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (course) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost" size="sm"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => navigate(`/courses/${course.slug}`)}
            title="Preview"
          />
          <Button
            variant="ghost" size="sm"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => navigate(`/instructor/courses/${course.slug}/edit`)}
            title="Edit"
          />
          <Button
            variant="ghost" size="sm"
            icon={course.published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            onClick={() => handlePublishToggle(course)}
            title={course.published ? 'Unpublish' : 'Publish'}
          />
          <Button
            variant="ghost" size="sm"
            icon={<Archive className="w-4 h-4" />}
            onClick={() => handleArchive(course)}
            title="Archive"
          />
          <Button
            variant="ghost" size="sm"
            icon={<Copy className="w-4 h-4" />}
            onClick={() => handleDuplicate(course)}
            title="Duplicate"
          />
          <Button
            variant="ghost" size="sm"
            icon={<Trash2 className="w-4 h-4 text-red-500" />}
            onClick={() => handleDelete(course)}
            title="Delete"
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <SEO title="Manage Courses" description="Create, edit, and manage your courses." />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Courses</h1>
            <p className="text-gray-500">Create, edit, and manage your courses.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {myCourses.length > 0 && (
              <Button variant="outline" onClick={() => openBroadcast(null)}>
                <Megaphone className="w-4 h-4 mr-2" /> Broadcast
              </Button>
            )}
            <Link to="/instructor/courses/new">
              <Button icon={<Plus className="w-4 h-4" />}>Create Course</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle + Search */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'card'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 max-w-md">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading && !error && <PageSkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <GlassCard className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to load courses</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchMyCourses}>Try Again</Button>
          </GlassCard>
        )}

        {/* Empty State */}
        {!isLoading && !error && filtered.length === 0 && (
          <GlassCard className="p-12 text-center">
            {(activeTab === 'pending' || activeTab === 'archived') ? (
              <>
                <Archive className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {activeTab === 'pending' ? 'No Pending Approval' : 'No Archived Courses'}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'pending'
                    ? 'Courses submitted for review will appear here.'
                    : 'Archived courses will be moved here for safekeeping.'
                  }
                </p>
              </>
            ) : (
              <>
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No courses yet</h3>
                <p className="text-sm text-gray-500 mb-4">Create your first course to get started.</p>
                <Link to="/instructor/courses/new">
                  <Button icon={<Plus className="w-4 h-4" />}>Create Course</Button>
                </Link>
              </>
            )}
          </GlassCard>
        )}

        {/* Content */}
        {!isLoading && !error && filtered.length > 0 && (
          <>
            {/* Card View */}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((course, i) => (
                  <motion.div
                    key={course.id || course.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <GlassCard hover className="p-0 overflow-hidden">
                      {/* Thumbnail */}
                      <div className="relative h-36 bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-12 h-12 text-white/40" />
                        )}
                        <div className="absolute top-3 right-3">
                          {statusBadge(course.published)}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4 space-y-3">
                        {/* Title */}
                        <h3 className="font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
                          {course.title}
                        </h3>

                        {/* School + Category */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {course.school_name && (
                            <Badge variant="primary" size="sm">
                              {course.school_name}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {course.category} &middot; {course.level}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {course.enrollmentCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-500" />{' '}
                            {course.averageRating ? course.averageRating.toFixed(1) : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />{' '}
                            {course.price ? formatCurrency(course.price) : 'Free'}
                          </span>
                        </div>

                        {/* Last Updated */}
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          Updated {formatDate(course.updated_at || course.created_at)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="sm"
                              icon={<Eye className="w-4 h-4" />}
                              onClick={() => navigate(`/courses/${course.slug}`)}
                              title="Preview"
                            />
                            <Button
                              variant="ghost" size="sm"
                              icon={<Edit className="w-4 h-4" />}
                              onClick={() => navigate(`/instructor/courses/${course.slug}/edit`)}
                              title="Edit"
                            />
                            <Button
                              variant="ghost" size="sm"
                              icon={course.published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                              onClick={() => handlePublishToggle(course)}
                              title={course.published ? 'Unpublish' : 'Publish'}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="sm"
                              icon={<Archive className="w-4 h-4 text-gray-400" />}
                              onClick={() => handleArchive(course)}
                              title="Archive"
                            />
                            <Button
                              variant="ghost" size="sm"
                              icon={<Copy className="w-4 h-4 text-gray-400" />}
                              onClick={() => handleDuplicate(course)}
                              title="Duplicate"
                            />
                            <Button
                              variant="ghost" size="sm"
                              icon={<Trash2 className="w-4 h-4 text-red-400" />}
                              onClick={() => handleDelete(course)}
                              title="Delete"
                            />
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <DataTable
                columns={columns}
                data={filtered}
                keyExtractor={(course) => course.id}
                emptyTitle="No courses match your search"
                emptyDescription="Try adjusting your search or filter criteria."
              />
            )}
          </>
        )}
      </motion.div>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {broadcastOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeBroadcast}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-500" />
                  {broadcastTarget ? `Message ${broadcastTarget.title} Students` : 'Broadcast to All Courses'}
                </h2>
                <button onClick={closeBroadcast} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                {broadcastTarget
                  ? `Send a message to all ${broadcastTarget.enrollmentCount || 0} enrolled students in "${broadcastTarget.title}".`
                  : `Send a message to all students enrolled in your ${myCourses.length} courses.`
                }
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    placeholder="e.g. Important Update"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Message</label>
                  <textarea
                    className="w-full h-32 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                    placeholder="Write your message to students..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <Button variant="outline" onClick={closeBroadcast}>Cancel</Button>
                <Button variant="primary" onClick={handleBroadcast} disabled={sending || !broadcastTitle.trim() || !broadcastMessage.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Sending...' : `Send to ${broadcastTarget ? broadcastTarget.enrollmentCount || 'all' : 'All'} Students`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
