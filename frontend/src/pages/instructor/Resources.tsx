import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Image, Video, Code, FolderOpen, File,
  Search, Download, Trash2, X, Loader2, AlertCircle
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useInstructorStore } from '@/store/instructorStore';
import SEO from '@/components/seo/SEO';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(type: string) {
  const ext = type.toLowerCase();
  if (/pdf|doc|docx/.test(ext)) return <FileText className="w-8 h-8 text-red-500" />;
  if (/png|jpg|jpeg|gif|svg|webp/.test(ext)) return <Image className="w-8 h-8 text-blue-500" />;
  if (/mp4|mov|avi|mkv|webm/.test(ext)) return <Video className="w-8 h-8 text-purple-500" />;
  if (/js|ts|py|java|cpp|c|go|rs|rb|php/.test(ext)) return <Code className="w-8 h-8 text-green-500" />;
  if (/zip|rar|7z|tar|gz/.test(ext)) return <FolderOpen className="w-8 h-8 text-yellow-500" />;
  return <File className="w-8 h-8 text-gray-400" />;
}

export default function Resources() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [dragOver, setDragOver] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { resources, myCourses, fetchResources, fetchMyCourses, uploadResource, deleteResource } = useInstructorStore();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchResources(), fetchMyCourses()]);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load resources');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchResources, fetchMyCourses]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    if (!selectedCourse) {
      toast.error('Please select a course first');
      return;
    }
    await uploadFiles(files);
  }, [selectedCourse]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (!selectedCourse) {
      toast.error('Please select a course first');
      return;
    }
    await uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', selectedCourse);
        await uploadResource(formData);
      }
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResource(id);
      toast.success('Resource deleted successfully');
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete resource');
    }
  };

  const courseOptions = myCourses.map(c => ({
    value: c.id,
    label: c.title
  }));

  const filtered = resources
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter(r => !courseFilter || r.courseId === courseFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'size': return b.size - a.size;
        case 'downloads': return b.downloadCount - a.downloadCount;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SEO title="Resources" description="Manage your course resources and files." />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Resources</h1>
          <p className="text-gray-500">Upload, manage, and organize your course resources.</p>
        </div>
      </div>

      {/* Upload Area */}
      <GlassCard className="p-6 mb-8">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200',
            dragOver
              ? 'border-primary-500 bg-primary-500/5'
              : 'border-gray-300 dark:border-gray-600'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
              dragOver ? 'bg-primary-500/20' : 'bg-gray-100 dark:bg-gray-800'
            )}>
              <Upload className={cn(
                'w-6 h-6',
                dragOver ? 'text-primary-500' : 'text-gray-400'
              )} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {dragOver ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-xs text-gray-400 mt-1">or click the button below to browse</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <Select
              options={courseOptions}
              placeholder="Select a course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full sm:w-64"
            />
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedCourse || uploading}
              icon={uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          options={[{ value: '', label: 'All Courses' }, ...courseOptions]}
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="w-48"
        />
        <Select
          options={[
            { value: 'date', label: 'Sort by Date' },
            { value: 'name', label: 'Sort by Name' },
            { value: 'size', label: 'Sort by Size' },
            { value: 'downloads', label: 'Sort by Downloads' },
          ]}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Content States */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200/60 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 p-5 animate-pulse">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="space-y-2 flex flex-col items-center">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <GlassCard className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Failed to load resources</h3>
            <p className="text-sm text-gray-500">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No resources uploaded yet</h3>
            <p className="text-sm text-gray-500">Upload files using the area above to get started.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((resource, i) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                layout
              >
                <GlassCard className="p-5 h-full flex flex-col">
                  <div className="flex items-center justify-center mb-4">
                    {getFileIcon(resource.type)}
                  </div>

                  <h3
                    className="font-semibold text-sm text-gray-900 dark:text-white text-center truncate mb-2"
                    title={resource.name}
                  >
                    {resource.name}
                  </h3>

                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Badge variant="primary" size="sm">{resource.courseTitle}</Badge>
                  </div>

                  <div className="mt-auto space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {resource.downloadCount} downloads
                      </span>
                      <span>{formatFileSize(resource.size)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {new Date(resource.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {deleteConfirm === resource.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(resource.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(resource.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Delete resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
