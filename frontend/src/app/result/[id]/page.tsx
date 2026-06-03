'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Sparkles,
  ArrowLeft,
  Download,
  RefreshCw,
  Clock,
  Star,
  BookOpen,
  Hash,
  User,
  ChevronDown,
  ChevronUp,
  Printer,
  Share2,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useAssignmentStore } from '@/store/assignmentStore';
import { getAssignment, regenerateAssignment, getPDFUrl } from '@/lib/api';
import { GeneratedPaper, Section, Question, Difficulty } from '@/types';

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; class: string; bg: string }> = {
  easy: { label: 'Easy', class: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  medium: { label: 'Moderate', class: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  hard: { label: 'Hard', class: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  'multiple-choice': 'MCQ',
  'short-answer': 'Short Answer',
  'long-answer': 'Long Answer',
  'true-false': 'True/False',
  'fill-in-the-blank': 'Fill Blank',
};

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.bg} ${config.class} whitespace-nowrap`}>
      {config.label}
    </span>
  );
}

function QuestionCard({ question, index }: { question: Question; index: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="text-primary-500 font-bold text-sm w-6 flex-shrink-0 mt-0.5">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-sm leading-relaxed">{question.text}</p>
          {question.options && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-slate-800/60 rounded-lg px-3 py-2 text-sm text-slate-400"
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DifficultyBadge difficulty={question.difficulty} />
          <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full whitespace-nowrap">
            {question.marks}m
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function SectionCard({ section, index }: { section: Section; index: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const sectionLetter = String.fromCharCode(65 + index);

  const difficultyCount = section.questions.reduce(
    (acc, q) => { acc[q.difficulty] = (acc[q.difficulty] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card overflow-hidden"
    >
      {/* Section Header */}
      <button
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/2 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center">
            <span className="font-bold text-primary-400 text-sm">{sectionLetter}</span>
          </div>
          <div>
            <h3 className="font-bold text-white">{section.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{section.instruction}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            {Object.entries(difficultyCount).map(([diff, count]) => {
              const cfg = DIFFICULTY_CONFIG[diff as Difficulty];
              return cfg ? (
                <span key={diff} className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.class}`}>
                  {count} {cfg.label}
                </span>
              ) : null;
            })}
          </div>
          <div className="text-right mr-3">
            <p className="text-xs text-slate-500">{section.questions.length} questions</p>
            <p className="text-sm font-semibold text-primary-400">{section.totalMarks} marks</p>
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Questions */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-800 px-5 pb-5 pt-4 space-y-3"
          >
            {section.questions.map((q, i) => (
              <QuestionCard key={q.id} question={q} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { generatedPaper, setGeneratedPaper, studentInfo, setStudentInfo } = useAssignmentStore();
  const [paper, setPaper] = useState<GeneratedPaper | null>(generatedPaper);
  const [loading, setLoading] = useState(!generatedPaper);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);

  useEffect(() => {
    if (!paper) {
      fetchPaper();
    }
  }, [id]);

  const fetchPaper = async () => {
    try {
      setLoading(true);
      const data = await getAssignment(id);
      if (data.data.generatedPaper) {
        setPaper(data.data.generatedPaper);
        setGeneratedPaper(data.data.generatedPaper);
      } else {
        toast.error('No paper found for this assignment');
        router.push('/history');
      }
    } catch {
      toast.error('Failed to load paper');
      router.push('/history');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      await regenerateAssignment(id);
      toast.success('Regenerating your paper...');
      router.push(`/generate/${id}`);
    } catch {
      toast.error('Failed to start regeneration');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const url = getPDFUrl(id, studentInfo.name, studentInfo.rollNumber, studentInfo.section);
      const response = await fetch(url);
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${paper?.title?.replace(/[^a-z0-9]/gi, '_') || 'paper'}_question_paper.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('PDF download failed. Make sure the backend is running with Puppeteer.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your paper...</p>
        </div>
      </div>
    );
  }

  if (!paper) return null;

  const totalEasy = paper.sections.flatMap((s) => s.questions).filter((q) => q.difficulty === 'easy').length;
  const totalMedium = paper.sections.flatMap((s) => s.questions).filter((q) => q.difficulty === 'medium').length;
  const totalHard = paper.sections.flatMap((s) => s.questions).filter((q) => q.difficulty === 'hard').length;
  const totalQuestions = paper.sections.reduce((s, sec) => s + sec.questions.length, 0);

  return (
    <div className="min-h-screen bg-[#0f0f13] pb-24">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-50 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-md px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/history" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-sm hidden sm:block">VedaAI</span>
            </div>
            <span className="text-slate-600 hidden sm:block">/</span>
            <span className="text-slate-400 text-sm hidden sm:block truncate max-w-xs">{paper.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStudentForm(!showStudentForm)}
              className="btn-secondary text-xs py-2 px-3 hidden sm:flex"
            >
              <User className="w-3.5 h-3.5" />
              Student Info
            </button>

            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-secondary text-xs py-2 px-3"
            >
              {regenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Regenerate</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="btn-primary text-xs py-2 px-3"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          </div>
        </div>

        {/* Student Info Form (collapsible) */}
        <AnimatePresence>
          {showStudentForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-w-4xl mx-auto overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 mt-3">
                {(['name', 'rollNumber', 'section'] as const).map((field) => (
                  <div key={field}>
                    <label className="text-xs text-slate-500 block mb-1">
                      {field === 'rollNumber' ? 'Roll Number' : field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      type="text"
                      placeholder={field === 'name' ? 'Student name' : field === 'rollNumber' ? 'Roll no.' : 'Section'}
                      value={studentInfo[field]}
                      onChange={(e) => setStudentInfo({ ...studentInfo, [field]: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        {/* Paper Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6"
        >
          <div className="text-center border-b border-slate-800 pb-5 mb-5">
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-3 py-1 text-xs text-primary-400 mb-3">
              <CheckCircle className="w-3 h-3" />
              AI Generated
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{paper.title}</h1>
            <p className="text-slate-400">Subject: {paper.subject}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              { icon: Clock, label: 'Duration', value: paper.duration },
              { icon: Star, label: 'Total Marks', value: `${paper.totalMarks}` },
              { icon: Hash, label: 'Questions', value: `${totalQuestions}` },
              { icon: BookOpen, label: 'Sections', value: `${paper.sections.length}` },
            ].map((item) => (
              <div key={item.label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                <item.icon className="w-4 h-4 text-primary-400 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                <p className="text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Difficulty Distribution */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Difficulty Distribution</p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                {totalEasy} Easy
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                {totalMedium} Moderate
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
                {totalHard} Hard
              </span>
            </div>
            <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden flex">
              {totalEasy > 0 && (
                <div
                  className="h-full bg-emerald-500/70"
                  style={{ width: `${(totalEasy / totalQuestions) * 100}%` }}
                />
              )}
              {totalMedium > 0 && (
                <div
                  className="h-full bg-amber-500/70"
                  style={{ width: `${(totalMedium / totalQuestions) * 100}%` }}
                />
              )}
              {totalHard > 0 && (
                <div
                  className="h-full bg-rose-500/70"
                  style={{ width: `${(totalHard / totalQuestions) * 100}%` }}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Student Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-400">Student Information</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Name', value: studentInfo.name, placeholder: 'Student Name' },
              { label: 'Roll Number', value: studentInfo.rollNumber, placeholder: 'Roll No.' },
              { label: 'Section', value: studentInfo.section, placeholder: 'Section' },
            ].map((field) => (
              <div key={field.label} className="border-b border-slate-700 pb-2">
                <p className="text-xs text-slate-500 mb-1">{field.label}</p>
                <p className="text-sm text-white min-h-[1.5rem]">
                  {field.value || (
                    <span className="text-slate-600 italic">{field.placeholder}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Click "Student Info" in the toolbar above to fill in student details before downloading PDF.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-5">
          {paper.sections.map((section, i) => (
            <SectionCard key={section.id} section={section} index={i} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-600">
            Generated by VedaAI on {new Date(paper.generatedAt).toLocaleString()}
          </p>
          <p className="text-xs text-slate-700 mt-1">*** End of Question Paper ***</p>
        </div>
      </div>
    </div>
  );
}
