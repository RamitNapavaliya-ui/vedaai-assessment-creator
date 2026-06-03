'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Sparkles,
  ArrowLeft,
  Upload,
  X,
  FileText,
  Calendar,
  BookOpen,
  Hash,
  Star,
  AlignLeft,
  Clock,
  GraduationCap,
  ChevronRight,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { useAssignmentStore } from '@/store/assignmentStore';
import { createAssignment } from '@/lib/api';
import { QuestionType, AssignmentFormData } from '@/types';

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'multiple-choice', label: 'Multiple Choice', icon: '⊙' },
  { value: 'short-answer', label: 'Short Answer', icon: '✍' },
  { value: 'long-answer', label: 'Long Answer', icon: '📝' },
  { value: 'true-false', label: 'True / False', icon: '⚖' },
  { value: 'fill-in-the-blank', label: 'Fill in the Blank', icon: '___' },
];

const GRADE_LEVELS = [
  'Grade 1-3', 'Grade 4-5', 'Grade 6-7', 'Grade 8',
  'Grade 9-10', 'Grade 11-12', 'Undergraduate', 'Postgraduate',
];

const DURATIONS = ['1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours', '3.5 hours'];

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
  'History', 'Geography', 'Computer Science', 'Economics', 'Other',
];

interface FormErrors {
  [key: string]: string;
}

function validateForm(form: AssignmentFormData): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'Title is required';
  if (!form.subject.trim()) errors.subject = 'Subject is required';
  if (!form.gradeLevel) errors.gradeLevel = 'Grade level is required';
  if (!form.dueDate) errors.dueDate = 'Due date is required';
  if (form.questionTypes.length === 0) errors.questionTypes = 'Select at least one question type';
  if (!form.totalQuestions || form.totalQuestions < 1) errors.totalQuestions = 'Minimum 1 question';
  if (form.totalQuestions > 100) errors.totalQuestions = 'Maximum 100 questions';
  if (!form.totalMarks || form.totalMarks < 1) errors.totalMarks = 'Marks must be at least 1';
  return errors;
}

export default function CreatePage() {
  const router = useRouter();
  const { form, setFormField, resetForm, setCurrentAssignmentId, setJobState } = useAssignmentStore();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        setFormField('file', acceptedFiles[0]);
        toast.success(`File uploaded: ${acceptedFiles[0].name}`);
      }
    },
    [setFormField]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: () => toast.error('Only PDF or TXT files up to 10MB are accepted'),
  });

  const handleBlur = (field: string) => {
    setTouched((prev) => new Set(Array.from(prev).concat(field)));
    const errs = validateForm(form);
    setErrors(errs);
  };

  const toggleQuestionType = (type: QuestionType) => {
    const current = form.questionTypes;
    if (current.includes(type)) {
      setFormField('questionTypes', current.filter((t) => t !== type));
    } else {
      setFormField('questionTypes', [...current, type]);
    }
    setTouched((prev) => new Set(Array.from(prev).concat('questionTypes')));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    setErrors(errs);
    setTouched(new Set(Object.keys(errs)));

    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createAssignment(form);
      const { assignmentId, jobId } = response.data;

      setCurrentAssignmentId(assignmentId);
      setJobState({
        jobId,
        assignmentId,
        status: 'waiting',
        progress: 0,
        message: 'Job queued...',
      });

      toast.success('Assignment created! Generating your paper...');
      router.push(`/generate/${assignmentId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create assignment';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#0f0f13] pb-20">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#0f0f13]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold tracking-tight">VedaAI</span>
          </div>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 text-sm">Create Assessment</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">Create New Assessment</h1>
            <p className="text-slate-400">Fill in the details and AI will generate your question paper.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="glass-card p-6 space-y-5">
              <h2 className="section-header">
                <BookOpen className="w-5 h-5 text-primary-400" />
                Basic Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Assessment Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  className={`input-field ${errors.title && touched.has('title') ? 'border-rose-500/70 focus:ring-rose-500/50' : ''}`}
                  placeholder="e.g. Mid-Term Physics Paper 2024"
                  value={form.title}
                  onChange={(e) => setFormField('title', e.target.value)}
                  onBlur={() => handleBlur('title')}
                />
                {errors.title && touched.has('title') && (
                  <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {errors.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`input-field appearance-none cursor-pointer ${errors.subject && touched.has('subject') ? 'border-rose-500/70' : ''}`}
                      value={form.subject}
                      onChange={(e) => setFormField('subject', e.target.value)}
                      onBlur={() => handleBlur('subject')}
                    >
                      <option value="">Select subject...</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  {errors.subject && touched.has('subject') && (
                    <p className="text-rose-400 text-xs mt-1.5">{errors.subject}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Grade Level <span className="text-rose-400">*</span>
                  </label>
                  <select
                    className={`input-field appearance-none cursor-pointer ${errors.gradeLevel && touched.has('gradeLevel') ? 'border-rose-500/70' : ''}`}
                    value={form.gradeLevel}
                    onChange={(e) => setFormField('gradeLevel', e.target.value)}
                    onBlur={() => handleBlur('gradeLevel')}
                  >
                    <option value="">Select grade...</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  {errors.gradeLevel && touched.has('gradeLevel') && (
                    <p className="text-rose-400 text-xs mt-1.5">{errors.gradeLevel}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Due Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    className={`input-field ${errors.dueDate && touched.has('dueDate') ? 'border-rose-500/70' : ''}`}
                    min={minDate}
                    value={form.dueDate}
                    onChange={(e) => setFormField('dueDate', e.target.value)}
                    onBlur={() => handleBlur('dueDate')}
                  />
                  {errors.dueDate && touched.has('dueDate') && (
                    <p className="text-rose-400 text-xs mt-1.5">{errors.dueDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Duration
                  </label>
                  <select
                    className="input-field appearance-none cursor-pointer"
                    value={form.duration}
                    onChange={(e) => setFormField('duration', e.target.value)}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Question Configuration */}
            <div className="glass-card p-6 space-y-5">
              <h2 className="section-header">
                <Hash className="w-5 h-5 text-primary-400" />
                Question Configuration
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Question Types <span className="text-rose-400">*</span>
                  <span className="text-slate-500 font-normal ml-2">(select all that apply)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {QUESTION_TYPES.map((qt) => {
                    const selected = form.questionTypes.includes(qt.value);
                    return (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => toggleQuestionType(qt.value)}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200
                          ${selected
                            ? 'bg-primary-600/20 border-primary-500/60 text-primary-300 shadow-primary-500/10 shadow-md'
                            : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                          }`}
                      >
                        <span className="text-base">{qt.icon}</span>
                        {qt.label}
                      </button>
                    );
                  })}
                </div>
                {errors.questionTypes && touched.has('questionTypes') && (
                  <p className="text-rose-400 text-xs mt-2">{errors.questionTypes}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    <Hash className="w-3.5 h-3.5 inline mr-1" />
                    Total Questions <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    className={`input-field ${errors.totalQuestions && touched.has('totalQuestions') ? 'border-rose-500/70' : ''}`}
                    min={1}
                    max={100}
                    value={form.totalQuestions}
                    onChange={(e) => setFormField('totalQuestions', parseInt(e.target.value) || 0)}
                    onBlur={() => handleBlur('totalQuestions')}
                  />
                  {errors.totalQuestions && touched.has('totalQuestions') && (
                    <p className="text-rose-400 text-xs mt-1.5">{errors.totalQuestions}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    <Star className="w-3.5 h-3.5 inline mr-1" />
                    Total Marks <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    className={`input-field ${errors.totalMarks && touched.has('totalMarks') ? 'border-rose-500/70' : ''}`}
                    min={1}
                    value={form.totalMarks}
                    onChange={(e) => setFormField('totalMarks', parseInt(e.target.value) || 0)}
                    onBlur={() => handleBlur('totalMarks')}
                  />
                  {errors.totalMarks && touched.has('totalMarks') && (
                    <p className="text-rose-400 text-xs mt-1.5">{errors.totalMarks}</p>
                  )}
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="section-header">
                <Upload className="w-5 h-5 text-primary-400" />
                Reference Material
                <span className="text-slate-500 font-normal text-sm ml-1">(optional)</span>
              </h2>
              <p className="text-sm text-slate-400 -mt-2">
                Upload a PDF or text file with syllabus / topics for more targeted questions.
              </p>

              {form.file ? (
                <div className="flex items-center justify-between bg-primary-500/10 border border-primary-500/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary-400" />
                    <div>
                      <p className="text-sm font-medium text-primary-300">{form.file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(form.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormField('file', null)}
                    className="text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-all duration-200
                    ${isDragActive
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'
                    }`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragActive ? 'text-primary-400' : 'text-slate-500'}`} />
                  <p className="text-sm font-medium text-slate-300 mb-1">
                    {isDragActive ? 'Drop file here' : 'Drop file here or click to browse'}
                  </p>
                  <p className="text-xs text-slate-500">PDF or TXT, up to 10MB</p>
                </div>
              )}
            </div>

            {/* Additional Instructions */}
            <div className="glass-card p-6">
              <h2 className="section-header">
                <AlignLeft className="w-5 h-5 text-primary-400" />
                Additional Instructions
                <span className="text-slate-500 font-normal text-sm ml-1">(optional)</span>
              </h2>
              <textarea
                className="input-field resize-none"
                rows={4}
                placeholder="e.g. Focus on thermodynamics and fluid mechanics. Include at least 3 numerical problems. Avoid very theoretical questions..."
                value={form.additionalInstructions}
                onChange={(e) => setFormField('additionalInstructions', e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-2">
                {form.additionalInstructions.length}/500 characters
              </p>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  toast.success('Form reset');
                }}
                className="btn-secondary text-sm"
              >
                Reset Form
              </button>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Question Paper
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
