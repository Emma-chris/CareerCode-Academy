import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Activity, TrendingUp, AlertTriangle, Search,
  Mail, BarChart3, ShieldAlert, Download, Send,
  Clock, AlertCircle
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { useInstructorStore } from '@/store/instructorStore';
import SEO from '@/components/seo/SEO';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface StudentCourse {
  id: string;
  title: string;
  progress: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  course: string;
  courseId: string;
  progress: number;
  lastActivity: string;
  courses: StudentCourse[];
}

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

export default function InstructorStudents() {
  const { myCourses, fetchMyCourses } = useInstructorStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [messageModal, setMessageModal] = useState<Student | null>(null);
  const [messageText, setMessageText] = useState('');
  const [progressModal, setProgressModal] = useState<Student | null>(null);
  const [warningStudent, setWarningStudent] = useState<Student | null>(null);

  useEffect(() => {
    (async () => {
      setIsPageLoading(true);
      try {
        const { default: api } = await import('@/lib/axios');
        const { data } = await api.get('/instructor/students');
        const mapped: Student[] = (data.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar || '',
          course: s.course_title || s.course || 'Assigned Course',
          courseId: s.course_id || s.courseId || '',
          progress: Math.round(s.avg_progress || s.progress || 0),
          lastActivity: s.last_activity || s.updated_at || s.created_at || new Date().toISOString(),
          courses: (s.courses || []).map((c: any) => ({ id: c.id || c.course_id, title: c.title || c.course_title, progress: Math.round(c.progress || 0) })),
        }));
        setStudents(mapped);
        setPageError(null);
      } catch (err: any) {
        setPageError(err?.response?.data?.message || 'Failed to load students');
        setStudents([]);
      } finally {
        setIsPageLoading(false);
      }
      if (myCourses.length === 0) fetchMyCourses();
    })();
  }, []);

  const totalStudents = students.length;
  const activeThisWeek = students.filter(s => {
    const diff = Date.now() - new Date(s.lastActivity).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const avgProgress = Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length);
  const atRisk = students.filter(s => s.progress < 50).length;

  const uniqueCourses = Array.from(new Set(students.map(s => s.course)));
  const courseOptions = [
    { value: 'all', label: 'All Courses' },
    ...uniqueCourses.map(c => ({ value: c, label: c })),
  ];

  const filtered = students
    .filter(s => courseFilter === 'all' || s.course === courseFilter)
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    toast.success(`Message sent to ${messageModal?.name}`);
    setMessageText('');
    setMessageModal(null);
  };

  const handleIssueWarning = () => {
    toast.success(`Warning issued to ${warningStudent?.name}`);
    setWarningStudent(null);
  };

  const columns: Column<Student>[] = [
    {
      key: 'name',
      label: 'Student Name',
      sortable: true,
      render: (student) => (
        <div className="flex items-center gap-3">
          {student.avatar ? (
            <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
              {student.name.charAt(0)}
            </div>
          )}
          <span className="font-medium text-sm text-gray-900 dark:text-white">{student.name}</span>
        </div>
      ),
      mobileRender: (student) => (
        <div className="flex items-center gap-3">
          {student.avatar ? (
            <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
              {student.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-medium text-sm text-gray-900 dark:text-white">{student.name}</div>
            <div className="text-xs text-gray-500">{student.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      className: 'hidden md:table-cell',
      render: (student) => (
        <span className="text-sm text-gray-500">{student.email}</span>
      ),
    },
    {
      key: 'course',
      label: 'Course',
      sortable: true,
      render: (student) => (
        <Badge variant="primary" size="sm">{student.course}</Badge>
      ),
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      render: (student) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="w-16 sm:w-20 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex-shrink-0">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                student.progress >= 80 ? 'bg-green-500' : student.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${student.progress}%` }}
            />
          </div>
          <span className={cn(
            'text-xs font-medium',
            student.progress >= 80 ? 'text-green-500' : student.progress >= 50 ? 'text-yellow-500' : 'text-red-500'
          )}>
            {student.progress}%
          </span>
        </div>
      ),
    },
    {
      key: 'lastActivity',
      label: 'Last Activity',
      sortable: true,
      className: 'hidden lg:table-cell',
      render: (student) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {timeAgo(student.lastActivity)}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (student) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<Mail className="w-3.5 h-3.5" />}
            onClick={() => setMessageModal(student)}
            title="Message"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<BarChart3 className="w-3.5 h-3.5" />}
            onClick={() => setProgressModal(student)}
            title="View Progress"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
            onClick={() => setWarningStudent(student)}
            title="Issue Warning"
          />
        </div>
      ),
    },
  ];

  if (isPageLoading) return <PageSkeleton />;

  if (pageError) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-gray-400">
        <AlertCircle className="w-16 h-16 mb-4 stroke-1 text-red-400" />
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Failed to load students</p>
        <p className="text-sm mt-1 mb-4">{pageError}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>Retry</Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SEO title="Students" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Students</h1>
          <p className="text-gray-500">Manage and monitor your enrolled students.</p>
        </div>
        <Button variant="outline" icon={<Download className="w-4 h-4" />}>
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GlassCard className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalStudents}</div>
              <div className="text-xs text-gray-500 font-medium">Total Students</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeThisWeek}</div>
              <div className="text-xs text-gray-500 font-medium">Active This Week</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{avgProgress}%</div>
              <div className="text-xs text-gray-500 font-medium">Avg Progress</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{atRisk}</div>
              <div className="text-xs text-gray-500 font-medium">At Risk</div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            options={courseOptions}
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="w-16 h-16 mb-4 stroke-1" />
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No students found</p>
          <p className="text-sm mt-1">Try adjusting your search or filter to find what you're looking for.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(s) => s.id}
          emptyTitle="No students found"
          emptyDescription="Try adjusting your search or filter."
        />
      )}

      <Modal
        isOpen={!!messageModal}
        onClose={() => { setMessageModal(null); setMessageText(''); }}
        title={`Message ${messageModal?.name}`}
      >
        <div className="space-y-4">
          <textarea
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 min-h-[120px] resize-none"
            placeholder="Write your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setMessageModal(null); setMessageText(''); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Send className="w-4 h-4" />}
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!progressModal}
        onClose={() => setProgressModal(null)}
        title={`${progressModal?.name}'s Progress`}
        size="lg"
      >
        <div className="space-y-6">
          {progressModal?.courses.map((course) => (
            <div key={course.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{course.title}</span>
                <span className="text-sm text-gray-500">{course.progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    course.progress >= 80 ? 'bg-green-500' : course.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
            <span className="text-sm font-semibold">Overall Progress</span>
            <Badge variant={progressModal && progressModal.progress >= 50 ? 'success' : 'danger'} size="md">
              {progressModal?.progress}%
            </Badge>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {warningStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setWarningStudent(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Issue Warning</h2>
                  <p className="text-sm text-gray-500">Send a warning to {warningStudent.name}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This will notify {warningStudent.name} about their academic performance and potential areas of concern. Are you sure you want to proceed?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setWarningStudent(null)}>
                  Cancel
                </Button>
                <Button variant="danger" icon={<ShieldAlert className="w-4 h-4" />} onClick={handleIssueWarning}>
                  Issue Warning
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
