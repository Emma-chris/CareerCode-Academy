import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Edit3, Trash2, Calendar, Award, ExternalLink, Clock, BookOpen, X, Search } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import SEO from '@/components/seo/SEO';
import { useInstructorStore } from '@/store/instructorStore';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface AssignmentForm {
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
}

const emptyForm: AssignmentForm = { courseId: '', title: '', description: '', dueDate: '', maxScore: 100 };

export default function InstructorAssignments() {
  const {
    myCourses, fetchMyCourses,
    assignments, fetchAssignmentsByCourse,
    createAssignment, updateAssignment, deleteAssignment,
  } = useInstructorStore();

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchMyCourses(); }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchAssignmentsByCourse(selectedCourseId);
    }
  }, [selectedCourseId]);

  const openCreate = () => {
    setForm({ ...emptyForm, courseId: selectedCourseId });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (a: any) => {
    setForm({
      courseId: a.course_id || selectedCourseId,
      title: a.title || '',
      description: a.description || '',
      dueDate: a.due_date ? a.due_date.slice(0, 16) : '',
      maxScore: a.max_score || 100,
    });
    setEditingId(a.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        courseId: form.courseId,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        maxScore: form.maxScore,
      };
      if (editingId) {
        await updateAssignment(editingId, payload);
        toast.success('Assignment updated');
      } else {
        await createAssignment(payload);
        toast.success('Assignment created');
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This action cannot be undone.`)) return;
    try {
      await deleteAssignment(id);
      toast.success('Assignment deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const selectedCourse = myCourses.find(c => c.id === selectedCourseId);
  const filtered = assignments.filter((a: any) =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SEO title="Assignments" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Assignments</h1>
          <p className="text-gray-500">Create and manage assignments for your courses.</p>
        </div>
      </div>

      {/* Course selector */}
      <GlassCard className="p-4 mb-6" hover={false}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full sm:w-auto">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30 transition-all"
            >
              <option value="">-- Select a course --</option>
              {myCourses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          {selectedCourseId && (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> New Assignment
            </Button>
          )}
        </div>
        {selectedCourseId && (
          <p className="text-sm text-gray-500 mt-3">
            <BookOpen className="w-3.5 h-3.5 inline mr-1" />
            {selectedCourse?.title} &middot; {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
          </p>
        )}
      </GlassCard>

      {/* Search */}
      {selectedCourseId && assignments.length > 0 && (
        <div className="mb-4">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Assignment list */}
      {!selectedCourseId ? (
        <GlassCard className="text-center py-16" hover={false}>
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Course</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Choose a course from the dropdown above to view and manage its assignments.
          </p>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="text-center py-16" hover={false}>
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {search ? 'No assignments match your search' : 'No Assignments Yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {search
              ? 'Try a different search term.'
              : 'Create your first assignment for this course.'}
          </p>
          {!search && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Create Assignment</Button>}
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any, i: number) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <GlassCard className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-primary-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {a.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{a.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      {a.due_date && (
                        <span><Calendar className="w-3 h-3 inline mr-1" />Due: {formatDate(a.due_date)}</span>
                      )}
                      <span><Award className="w-3 h-3 inline mr-1" />Max: {a.max_score || 100} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={`/instructor/submissions?assignmentId=${a.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-colors"
                    >
                      Submissions <ExternalLink className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => openEdit(a)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id, a.title)}
                      className="p-2 rounded-lg text-gray-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-lg p-6 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editingId ? 'Edit Assignment' : 'New Assignment'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Course</label>
                  <select
                    value={form.courseId}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    disabled={!!editingId}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30 transition-all disabled:opacity-50"
                  >
                    <option value="">-- Select course --</option>
                    {myCourses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., React Component Library"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30 transition-all resize-none"
                    placeholder="Describe the assignment requirements..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input
                      type="datetime-local"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Score</label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={form.maxScore}
                      onChange={(e) => setForm({ ...form, maxScore: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleSave} loading={saving}>
                  {editingId ? 'Update' : 'Create'} Assignment
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
