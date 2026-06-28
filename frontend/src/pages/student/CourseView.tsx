import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import HighlightExt from '@tiptap/extension-highlight';
import PlaceholderExt from '@tiptap/extension-placeholder';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import SolveChallenge from '../../components/student/SolveChallenge';
import VideoPlayer from '../../components/VideoPlayer';
import { optimizeImageUrl } from '../../lib/cloudinary';
import toast from 'react-hot-toast';
import {
  PlayCircle, CheckCircle, Lock, ChevronLeft, ChevronRight,
  FileText, Download, BookOpen, Clock, Award,
  ChevronDown, ChevronUp, PenLine, HelpCircle, Monitor, Code,
  Bookmark, BookmarkCheck, Gauge, Minimize2, PartyPopper,
  Megaphone, BarChart3, Brain, Palette, Image, Briefcase,
  Bold, Italic, Underline, Highlighter, Undo, Redo,
} from 'lucide-react';
import SEO from '@/components/seo/SEO';

type Tab = 'notes' | 'quiz' | 'resources' | 'challenge' | 'announcements' | 'analytics';

export default function CourseView() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({});
  const [watchPosition, setWatchPosition] = useState<Record<string, number>>({});
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [resourceView, setResourceView] = useState<'formatted' | 'plain'>('formatted');
  const [lessonQuiz, setLessonQuiz] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('bookmarkedLessons');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('');
  const currentLessonIdRef = useRef<string | null>(null);
  const courseIdRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      HighlightExt,
      PlaceholderExt.configure({ placeholder: 'Write your notes for this lesson here...' }),
    ],
    onUpdate: ({ editor: ed }) => {
      const lessonId = currentLessonIdRef.current;
      if (!lessonId) return;
      const html = ed.getHTML();
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await api.post(`/lessons/${lessonId}/notes`, { content: html });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(''), 2000);
        } catch {
          setSaveStatus('');
        }
      }, 1500);
    },
  });

  const handlePositionUpdate = useCallback((lessonId: string, cId: string, position: number, percentage: number) => {
    api.put('/progress/watch-position', {
      lessonId,
      courseId: cId,
      watchPosition: position,
      watchPercentage: percentage,
    }).catch(() => {});
  }, []);


  useEffect(() => {
    localStorage.setItem('bookmarkedLessons', JSON.stringify(bookmarkedLessons));
  }, [bookmarkedLessons]);

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [courseRes, enrollmentRes] = await Promise.all([
        api.get(`/courses/slug/${slug}`),
        api.get('/enrollments'),
      ]);

      const courseData = courseRes.data.data;
      setCourse(courseData);
      courseIdRef.current = courseData.id;

      const enrollmentData = enrollmentRes.data.data || [];
      const myEnrollment = enrollmentData.find((e: any) => e.course_id === courseData.id);
      setEnrollment(myEnrollment);

      // Fetch modules with lessons
      const modulesRes = await api.get(`/modules/course/${courseData.id}`);
      const rawModules = modulesRes.data.data || [];
      const lessons = courseData.lessons || [];

      const enrichedModules = rawModules.map((m: any) => ({
        ...m,
        lessons: lessons
          .filter((l: any) => l.module_id === m.id)
          .sort((a: any, b: any) => a.order_index - b.order_index),
      }));

      // Filter out lessons not in any module as "Ungrouped"
      const moduleLessonIds = new Set(lessons.filter((l: any) => l.module_id).map((l: any) => l.id));
      const ungroupedLessons = lessons.filter((l: any) => !moduleLessonIds.has(l.id) || !l.module_id);

      if (ungroupedLessons.length > 0) {
        enrichedModules.push({
          id: 'ungrouped',
          title: 'Course Content',
          lessons: ungroupedLessons,
        });
      }

      setModules(enrichedModules);

      const initialExpanded: Record<string, boolean> = {};
      enrichedModules.forEach((m: any) => { initialExpanded[m.id] = true; });
      setExpandedModules(initialExpanded);

      if (myEnrollment) {
        const progressRes = await api.get(`/progress?courseId=${courseData.id}`);
        const progressMap: Record<string, boolean> = {};
        const watchMap: Record<string, number> = {};
        (progressRes.data.data?.progress || []).forEach((p: any) => {
          if (p.completed) progressMap[p.lesson_id] = true;
          watchMap[p.lesson_id] = p.watch_position || 0;
        });
        setLessonProgress(progressMap);
        setWatchPosition(watchMap);
      }

      // Fetch course announcements
      try {
        const annRes = await api.get(`/courses/${courseData.id}/announcements`);
        setAnnouncements(annRes.data.data || []);
      } catch { setAnnouncements([]); }

      setAccessChecked(true);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast.error('Please login to access course content');
      } else {
        toast.error('Failed to load course');
      }
    } finally {
      setLoading(false);
    }
  };

  const allFlatLessons = modules.flatMap((m: any) => m.lessons || []);
  const totalLessons = allFlatLessons.length;
  const completedCount = Object.values(lessonProgress).filter(Boolean).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const hasAccess = !!enrollment;
  const isCompleted = enrollment?.status === 'completed' || enrollment?.completed;

  // Find the current module + lesson indices based on flat index
  let currentLesson: any = null;
  let currentModIdx = 0;
  let currentLessIdx = 0;
  let flatIdx = 0;
  for (let mi = 0; mi < modules.length; mi++) {
    const moduleLessons = modules[mi].lessons || [];
    for (let li = 0; li < moduleLessons.length; li++) {
      if (flatIdx === currentLessonIndex) {
        currentLesson = moduleLessons[li];
        currentModIdx = mi;
        currentLessIdx = li;
      }
      flatIdx++;
    }
  }

  const handleWatchProgress = (lessonId: string) => {
    // Track watch time on video progress
    const video = document.querySelector('video');
    if (video && course) {
      const percentage = Math.round((video.currentTime / video.duration) * 100);
      if (percentage > 0) {
        api.put('/progress/watch-position', {
          lessonId,
          courseId: course.id,
          watchPosition: Math.round(video.currentTime),
          watchPercentage: percentage,
        }).catch(() => {});
      }
    }
  };

  const markCompleted = async () => {
    if (!currentLesson || !course) return;
    const newCompleted = !lessonProgress[currentLesson.id];
    try {
      await api.post('/progress', {
        lessonId: currentLesson.id,
        completed: newCompleted,
        courseId: course.id,
      });
      setLessonProgress(prev => ({
        ...prev,
        [currentLesson.id]: newCompleted,
      }));
      toast.success(newCompleted ? 'Lesson completed!' : 'Progress updated');

      // Auto advance to next lesson (respect autoplay setting)
      if (newCompleted && autoPlayNext && currentLessonIndex < totalLessons - 1) {
        setTimeout(() => goToLesson(currentLessonIndex + 1), 800);
      }
    } catch (error: any) {
      if (error?.response?.data?.quizRequired) {
        toast.error('Complete the lesson quiz first!');
        setActiveTab('quiz');
      } else {
        toast.error(error?.response?.data?.error || 'Failed to update progress');
      }
    }
  };

  const goToLesson = (index: number) => {
    if (index >= 0 && index < totalLessons) {
      setCurrentLessonIndex(index);
      // Load notes, quiz, resources for the new lesson
      loadLessonContent(allFlatLessons[index]);
    }
  };

  const loadLessonContent = async (lesson: any) => {
    if (!lesson) return;
    currentLessonIdRef.current = lesson.id;
    // Load notes
    try {
      const { data } = await api.get(`/lessons/${lesson.id}/notes`);
      const content = data.data || '';
      setNotes(content);
      if (editor) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    } catch {
      setNotes('');
      if (editor) {
        editor.commands.setContent('', { emitUpdate: false });
      }
    }
    // Load resources
    try {
      const { data } = await api.get(`/resources/lesson/${lesson.id}`);
      setResources(data.data || []);
    } catch {
      setResources([]);
    }
    // Load quiz
    try {
      const quizRes = await api.get(`/quizzes/lesson/${lesson.id}`);
      setLessonQuiz(quizRes.data.data || null);
    } catch {
      setLessonQuiz(null);
    }
    // Load coding challenges
    try {
      const chalRes = await api.get(`/challenges/lesson/${lesson.id}`);
      setChallenges(chalRes.data.data || []);
    } catch {
      setChallenges([]);
    }
  };

  const saveNotes = async () => {};  // Replaced by auto-save via Tiptap onUpdate

  const moduleCompletedCount = (moduleLessons: any[]) => {
    return moduleLessons.filter((l: any) => lessonProgress[l.id]).length;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'ArrowLeft') {
        if (currentLessonIndex > 0) goToLesson(currentLessonIndex - 1);
      }
      if (e.key === 'ArrowRight') {
        if (currentLessonIndex < totalLessons - 1) goToLesson(currentLessonIndex + 1);
      }
      if (e.key === ' ') {
        const video = document.querySelector('video');
        if (video) {
          e.preventDefault();
          video.paused ? video.play() : video.pause();
        }
      }
      if (e.key === 'm' || e.key === 'M') {
        const video = document.querySelector('video');
        if (video) {
          video.muted = !video.muted;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentLessonIndex, totalLessons]);

  // Course completion celebration
  useEffect(() => {
    if (totalLessons > 0 && completedCount === totalLessons && !showCompletion) {
      setShowCompletion(true);
      const timer = setTimeout(() => setShowCompletion(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [completedCount, totalLessons]);

  // Fetch analytics when tab is activated
  useEffect(() => {
    if (activeTab === 'analytics' && !analytics && !loadingAnalytics && slug) {
      (async () => {
        setLoadingAnalytics(true);
        try {
          const { data } = await api.get(`/student/courses/${slug}/analytics`);
          if (data.success) setAnalytics(data.data);
        } catch {
          // silently fail
        } finally {
          setLoadingAnalytics(false);
        }
      })();
    }
  }, [activeTab, analytics, loadingAnalytics, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Course Not Found</h2>
          <Link to="/student/courses" className="text-blue-400 hover:underline">Back to My Courses</Link>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <GlassCard className="max-w-md text-center p-8">
          <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Required</h2>
          <p className="text-gray-400 mb-6">You need to enroll in this course to access the content.</p>
          <Link to={`/courses/${slug}`}>
            <Button>View Course Details</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <SEO title={course?.title ? `${course.title} | Learning` : 'Course'} />
      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/student/dashboard" className="text-gray-400 hover:text-white transition-colors shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm truncate">{course.title}</h1>
            <p className="text-gray-500 text-xs truncate">{currentLesson?.title || 'Select a lesson'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Autoplay toggle */}
          <button
            onClick={() => setAutoPlayNext(!autoPlayNext)}
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
              autoPlayNext ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
            }`}
            title={autoPlayNext ? 'Autoplay next lesson is on' : 'Autoplay next lesson is off'}
          >
            <PlayCircle className="w-3 h-3" />
            Auto
          </button>
          <Badge className="bg-blue-500/20 text-blue-400 text-xs">
            {progressPercent}% complete
          </Badge>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? 'block' : 'hidden'
        } lg:block w-full lg:w-72 bg-gray-900 border-r border-gray-800 overflow-y-auto shrink-0`}>
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-semibold">Course Content</span>
              <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                {completedCount}/{totalLessons}
              </Badge>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isCompleted && (
              <div className="mt-1 flex items-center gap-1 text-emerald-400 text-[10px]">
                <Award className="w-3 h-3" /> Certificate earned
              </div>
            )}
          </div>

          <div className="py-1">
            {modules.map((mod: any, mi: number) => {
              const modLessons = mod.lessons || [];
              if (modLessons.length === 0) return null;
              const modCompleted = moduleCompletedCount(modLessons);
              const modTotal = modLessons.length;
              const isExpanded = expandedModules[mod.id];

              return (
                <div key={mod.id}>
                  <button
                    onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronUp className="w-3 h-3 text-gray-500 shrink-0" />
                    )}
                    <span className="text-xs text-gray-400 font-medium truncate flex-1 text-left">{mod.title}</span>
                    <span className="text-[10px] text-gray-600">{modCompleted}/{modTotal}</span>
                  </button>

                  {isExpanded && modLessons.map((lesson: any, li: number) => {
                    let flatIdx = 0;
                    for (let i = 0; i < modules.length; i++) {
                      for (let j = 0; j < (modules[i].lessons || []).length; j++) {
                        if (i === mi && j === li) break;
                        flatIdx++;
                      }
                      if (i === mi) break;
                    }
                    // Recalculate flat index more carefully
                    let calculatedFlatIdx = 0;
                    for (let i = 0; i < mi; i++) {
                      calculatedFlatIdx += (modules[i].lessons || []).length;
                    }
                    calculatedFlatIdx += li;

                    const isCurrent = calculatedFlatIdx === currentLessonIndex;
                    const isLCompleted = lessonProgress[lesson.id];
                    const watchPos = watchPosition[lesson.id] || 0;
                    const isBookmarked = bookmarkedLessons[lesson.id];

                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-0 transition-colors ${
                          isCurrent
                            ? 'bg-blue-500/10 border-l-2 border-blue-500'
                            : 'hover:bg-gray-800/30 border-l-2 border-transparent'
                        }`}
                      >
                        <button
                          onClick={() => { if (!isCurrent) goToLesson(calculatedFlatIdx); }}
                          className="flex-1 flex items-center gap-2 py-1.5 px-1 min-w-0"
                        >
                          {isLCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <PlayCircle className={`w-3.5 h-3.5 shrink-0 ${lesson.isFree ? 'text-blue-400' : 'text-gray-600'}`} />
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`text-xs truncate ${isCurrent ? 'text-white' : 'text-gray-400'}`}>
                              {lesson.title}
                            </p>
                            {watchPos > 0 && !isLCompleted && (
                              <div className="w-full bg-gray-800 rounded-full h-0.5 mt-0.5">
                                <div className="bg-blue-500 h-0.5 rounded-full" style={{ width: `${Math.min((watchPos / 600) * 100, 100)}%` }} />
                              </div>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => setBookmarkedLessons(prev => ({ ...prev, [lesson.id]: !prev[lesson.id] }))}
                          className="p-1.5 shrink-0 hover:text-yellow-400 transition-colors"
                          title={isBookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="w-3 h-3 text-yellow-400" />
                          ) : (
                            <Bookmark className="w-3 h-3 text-gray-600" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Area */}
          <div className="bg-black" style={{ maxHeight: '55vh' }}>
                  <VideoPlayer
                    videoUrl={currentLesson?.video_url || null}
                    lessonId={currentLesson?.id || null}
                    courseId={course?.id}
                    title={currentLesson?.title}
                    description={currentLesson?.description}
                    playbackSpeed={playbackSpeed}
                    initialPosition={watchPosition[currentLesson?.id] || 0}
                    onProgress={handleWatchProgress}
                    onPositionUpdate={handlePositionUpdate}
                    onSpeedChange={setPlaybackSpeed}
                  />
          </div>

          {/* Tabs + Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="bg-gray-900 border-b border-gray-800 flex px-4 shrink-0">
              {([
                { key: 'notes', label: 'Notes', icon: PenLine },
                { key: 'quiz', label: 'Quiz', icon: HelpCircle },
                { key: 'resources', label: 'Resources', icon: Download },
                { key: 'challenge', label: 'Challenge', icon: Code },
                { key: 'announcements', label: 'Announcements', icon: Megaphone },
                { key: 'analytics', label: 'Analytics', icon: BarChart3 },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-400 border-blue-500'
                      : 'text-gray-500 border-transparent hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto bg-gray-900/50 p-4">
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-sm font-medium">Your Notes</h3>
                    {saveStatus && (
                      <span className={`text-xs ${saveStatus === 'saved' ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {saveStatus === 'saving' ? 'Saving...' : 'Saved ✓'}
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
                    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-800 bg-gray-900/50">
                      <button
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded transition-colors ${editor?.isActive('bold') ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded transition-colors ${editor?.isActive('italic') ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        className={`p-1.5 rounded transition-colors ${editor?.isActive('underline') ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        title="Underline"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleHighlight().run()}
                        className={`p-1.5 rounded transition-colors ${editor?.isActive('highlight') ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        title="Highlight"
                      >
                        <Highlighter className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-px h-4 bg-gray-700 mx-1" />
                      <button
                        onClick={() => editor?.chain().focus().undo().run()}
                        disabled={!editor?.can().undo()}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo"
                      >
                        <Undo className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().redo().run()}
                        disabled={!editor?.can().redo()}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo"
                      >
                        <Redo className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <EditorContent
                      editor={editor}
                      className="prose prose-invert max-w-none text-sm text-gray-200 p-3 min-h-[160px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[120px]"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'quiz' && (
                <div>
                  {lessonQuiz ? (
                    <LessonQuiz quiz={lessonQuiz} lessonId={currentLesson?.id} />
                  ) : (
                    <p className="text-gray-500 text-sm">No quiz available for this lesson.</p>
                  )}
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-4">
                  {/* Lesson Description as Primary Resource */}
                  {currentLesson?.description && (
                    <div className="rounded-xl bg-gray-800/50 border border-gray-700/50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-white">Lesson Summary</span>
                        </div>
                        <div className="flex bg-gray-900 rounded-lg p-0.5">
                          <button
                            onClick={() => setResourceView('formatted')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              resourceView === 'formatted' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Formatted
                          </button>
                          <button
                            onClick={() => setResourceView('plain')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              resourceView === 'plain' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Plain Text
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        {resourceView === 'formatted' ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <h4 className="text-white font-semibold text-base mb-2">{currentLesson?.title}</h4>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{currentLesson?.description}</p>
                          </div>
                        ) : (
                          <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap bg-gray-900/50 p-3 rounded-lg">
                            {currentLesson?.description}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Uploaded File Resources */}
                  {resources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Downloadable Resources
                      </h4>
                      <div className="space-y-2">
                        {resources.map((res: any) => (
                          <a
                            key={res.id}
                            href={res.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
                          >
                            <Download className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate">{res.title}</p>
                              {res.file_type && (
                                <p className="text-xs text-gray-500">{res.file_type}</p>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!currentLesson?.description && resources.length === 0 && (
                    <p className="text-gray-500 text-sm">No resources available for this lesson.</p>
                  )}
                </div>
              )}

              {activeTab === 'challenge' && (
                <div className="space-y-4">
                  {challenges.length === 0 ? (
                    <p className="text-gray-500 text-sm">No coding challenges for this lesson.</p>
                  ) : (
                    challenges.map((ch: any) => (
                      <ChallengeCard key={ch.id} challenge={ch} />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'announcements' && (
                <div className="space-y-3">
                  <h3 className="text-white text-sm font-medium flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-400" />
                    Course Announcements
                  </h3>
                  {announcements.length === 0 ? (
                    <p className="text-gray-500 text-sm">No announcements for this course yet.</p>
                  ) : (
                    announcements.map((ann: any) => (
                      <div key={ann.id} className="p-4 rounded-xl bg-gray-800/50 border-l-2 border-blue-500">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white text-sm font-medium">{ann.title}</h4>
                          <span className="text-gray-500 text-xs">{new Date(ann.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-blue-400 mb-2">{ann.instructor_name}</p>
                        <p className="text-gray-400 text-sm whitespace-pre-wrap">{ann.content}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Course Analytics
                    </h3>
                    <button
                      onClick={async () => {
                        setLoadingAnalytics(true);
                        try {
                          const { data } = await api.get(`/student/courses/${slug}/analytics`);
                          if (data.success) setAnalytics(data.data);
                        } catch {
                          toast.error('Failed to load analytics');
                        } finally {
                          setLoadingAnalytics(false);
                        }
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Refresh
                    </button>
                  </div>

                  {loadingAnalytics && !analytics && <Loader />}

                  {analytics && (
                    <>
                      {/* Progress Overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <GlassCard className="p-3 text-center">
                          <p className="text-2xl font-bold text-white">{analytics.lessons.completionRate}%</p>
                          <p className="text-xs text-gray-500 mt-1">Completion</p>
                        </GlassCard>
                        <GlassCard className="p-3 text-center">
                          <p className="text-2xl font-bold text-white">{analytics.lessons.completed}/{analytics.lessons.total}</p>
                          <p className="text-xs text-gray-500 mt-1">Lessons</p>
                        </GlassCard>
                        <GlassCard className="p-3 text-center">
                          <p className="text-2xl font-bold text-white">{analytics.timeSpent.totalHours}h</p>
                          <p className="text-xs text-gray-500 mt-1">Time Spent</p>
                        </GlassCard>
                        <GlassCard className="p-3 text-center">
                          <p className="text-2xl font-bold text-white">{analytics.quizzes.averageScore}%</p>
                          <p className="text-xs text-gray-500 mt-1">Quiz Avg</p>
                        </GlassCard>
                      </div>

                      {/* Weekly Activity */}
                      <GlassCard className="p-4">
                        <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          Weekly Activity
                        </h4>
                        <div className="flex items-end gap-1.5 h-24">
                          {analytics.weeklyActivity.map((day: any) => {
                            const maxLessons = Math.max(...analytics.weeklyActivity.map((d: any) => d.lessons), 1);
                            const height = Math.max((day.lessons / maxLessons) * 100, 4);
                            return (
                              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] text-gray-500">{day.lessons}</span>
                                <div
                                  className="w-full rounded-sm bg-blue-500/40 transition-all"
                                  style={{ height: `${height}%`, minHeight: '4px' }}
                                />
                                <span className="text-[10px] text-gray-600">{day.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </GlassCard>

                      {/* Assessments */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <GlassCard className="p-3">
                          <h4 className="text-white text-xs font-medium mb-2 flex items-center gap-1.5">
                            <Brain className="w-3 h-3 text-emerald-400" />
                            Assignments
                          </h4>
                          <p className="text-sm text-gray-400">
                            Submitted: <span className="text-white font-medium">{analytics.assignments.submitted}</span>
                          </p>
                          <p className="text-sm text-gray-400">
                            Avg Score: <span className="text-white font-medium">{analytics.assignments.averageScore}%</span>
                          </p>
                        </GlassCard>
                        <GlassCard className="p-3">
                          <h4 className="text-white text-xs font-medium mb-2 flex items-center gap-1.5">
                            <Code className="w-3 h-3 text-purple-400" />
                            Challenges
                          </h4>
                          <p className="text-sm text-gray-400">
                            Submitted: <span className="text-white font-medium">{analytics.challenges.submitted}</span>
                          </p>
                          <p className="text-sm text-gray-400">
                            Passed: <span className="text-white font-medium">{analytics.challenges.passed}</span>
                          </p>
                          <p className="text-sm text-gray-400">
                            Avg Score: <span className="text-white font-medium">{analytics.challenges.averageScore}%</span>
                          </p>
                        </GlassCard>
                      </div>
                    </>
                  )}

                  {!loadingAnalytics && !analytics && (
                    <button
                      onClick={async () => {
                        setLoadingAnalytics(true);
                        try {
                          const { data } = await api.get(`/student/courses/${slug}/analytics`);
                          if (data.success) setAnalytics(data.data);
                        } catch {
                          toast.error('Failed to load analytics');
                        } finally {
                          setLoadingAnalytics(false);
                        }
                      }}
                      className="w-full py-8 border-2 border-dashed border-gray-800 rounded-xl text-gray-500 text-sm hover:border-gray-700 hover:text-gray-400 transition-colors"
                    >
                      Load Analytics
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToLesson(currentLessonIndex - 1)}
              disabled={currentLessonIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {currentLessonIndex + 1} / {totalLessons}
              </span>
              <Button
                variant={lessonProgress[currentLesson?.id] ? "secondary" : "primary"}
                size="sm"
                onClick={markCompleted}
                disabled={!currentLesson}
                className={lessonProgress[currentLesson?.id] ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                {lessonProgress[currentLesson?.id] ? (
                  <><CheckCircle className="w-4 h-4 mr-1" /> Completed</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-1" /> Mark Complete</>
                )}
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToLesson(currentLessonIndex + 1)}
              disabled={currentLessonIndex >= totalLessons - 1}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
      {/* Completion Celebration */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCompletion(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-gray-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10"
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
              >
                <PartyPopper className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Congratulations!</h2>
              <p className="text-gray-400 mb-2">
                You completed all lessons in <span className="text-emerald-400 font-semibold">{course?.title}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Great dedication! Keep up the amazing work.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowCompletion(false)}>Continue</Button>
                <Link to="/student/certificates">
                  <Button variant="outline">View Certificate</Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: any }) {
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
  const tc = typeConfig[challenge.type] || typeConfig.code;
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
            <p className="text-gray-500 text-xs mt-0.5">{challenge.description}</p>
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

      <div className="text-xs text-gray-400 mb-3 whitespace-pre-wrap">{challenge.instructions}</div>

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

function LessonQuiz({ quiz, lessonId: _lessonId }: { quiz: any; lessonId: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSubmit = async () => {
    const questions = quiz.questions || [];
    let correct = 0;
    questions.forEach((q: any) => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setScore(pct);
    setSubmitted(true);
  };

  if (!quiz.questions?.length) {
    return <p className="text-gray-500 text-sm">No questions in this quiz yet.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-white text-sm font-medium">{quiz.title || 'Lesson Quiz'}</h3>
      {quiz.description && (
        <p className="text-gray-400 text-xs">{quiz.description}</p>
      )}

      {quiz.questions.map((q: any, qi: number) => {
        const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        const isCorrect = submitted && answers[q.id] === q.correct_answer;
        const isWrong = submitted && answers[q.id] && answers[q.id] !== q.correct_answer;

        return (
          <div key={q.id || qi} className="p-3 rounded-xl bg-gray-800/50 space-y-2">
            <p className="text-sm text-white font-medium">{qi + 1}. {q.question}</p>
            <div className="space-y-1">
              {(Array.isArray(options) ? options : []).map((opt: string, oi: number) => {
                const isSelected = answers[q.id] === opt;
                const isCorrectOpt = submitted && opt === q.correct_answer;
                return (
                  <label
                    key={oi}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                      submitted
                        ? isCorrectOpt
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isWrong && isSelected
                            ? 'bg-red-500/20 text-red-400'
                            : 'text-gray-400'
                        : isSelected
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={isSelected}
                      onChange={() => !submitted && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      disabled={submitted}
                      className="hidden"
                    />
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                      isCorrectOpt ? 'border-emerald-400 bg-emerald-400' :
                      isWrong && isSelected ? 'border-red-400 bg-red-400' :
                      isSelected ? 'border-blue-400 bg-blue-400' : 'border-gray-600'
                    }`} />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {!submitted && (
        <Button onClick={handleSubmit} size="sm">Submit Answers</Button>
      )}
      {submitted && score !== null && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          Score: {score}% {score >= 70 ? '✅ Passed' : '❌ Needs improvement'}
        </div>
      )}
    </div>
  );
}
