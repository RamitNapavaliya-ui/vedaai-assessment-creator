'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  Hash,
  Star,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { getAssignments } from '@/lib/api';
import { Assignment } from '@/types';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Completed' },
  active: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', label: 'Generating' },
  waiting: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'Queued' },
  failed: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', label: 'Failed' },
  idle: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', label: 'Pending' },
};

function AssignmentCard({ assignment, index }: { assignment: Assignment; index: number }) {
  const router = useRouter();
  const status = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.idle;
  const StatusIcon = status.icon;
  const dueDate = new Date(assignment.dueDate);
  const isPast = dueDate < new Date();

  const handleClick = () => {
    if (assignment.status === 'completed') {
      router.push(`/result/${assignment._id}`);
    } else if (assignment.status === 'active' || assignment.status === 'waiting') {
      router.push(`/generate/${assignment._id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={handleClick}
      className={`glass-card p-5 transition-all duration-200 
        ${assignment.status !== 'failed' ? 'cursor-pointer hover:border-white/20 hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{assignment.title}</h3>
            <p className="text-sm text-slate-400 mt-0.5">{assignment.subject}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <BookOpen className="w-3 h-3" />
                {assignment.gradeLevel}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Hash className="w-3 h-3" />
                {assignment.totalQuestions} Qs
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Star className="w-3 h-3" />
                {assignment.totalMarks} marks
              </span>
              <span className={`flex items-center gap-1 text-xs ${isPast ? 'text-rose-400' : 'text-slate-500'}`}>
                <Clock className="w-3 h-3" />
                Due {dueDate.toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}>
            <StatusIcon className={`w-3 h-3 ${assignment.status === 'active' ? 'animate-spin' : ''}`} />
            {status.label}
          </span>
          {assignment.status === 'completed' && (
            <span className={`text-xs text-slate-500 flex items-center gap-1`}>
              View paper <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssignments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const data = await getAssignments(1, 50);
      setAssignments(data.data);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAssignments();
    const interval = setInterval(() => loadAssignments(), 10000);
    return () => clearInterval(interval);
  }, []);

  const completed = assignments.filter((a) => a.status === 'completed').length;
  const pending = assignments.filter((a) => ['waiting', 'active'].includes(a.status)).length;
  const failed = assignments.filter((a) => a.status === 'failed').length;

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
          <span className="text-slate-400 text-sm">History</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAssignments(true)}
            className="btn-secondary text-sm py-2 px-3"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/create" className="btn-primary text-sm py-2 px-4">
            <Plus className="w-4 h-4" />
            New Assessment
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-1">Assessment History</h1>
          <p className="text-slate-400 text-sm mb-6">All your generated question papers</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Completed', value: completed, color: 'text-emerald-400' },
              { label: 'In Progress', value: pending, color: 'text-amber-400' },
              { label: 'Failed', value: failed, color: 'text-rose-400' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-400 mb-2">No assessments yet</h2>
              <p className="text-slate-600 mb-6">Create your first AI-generated question paper.</p>
              <Link href="/create" className="btn-primary mx-auto w-fit">
                <Plus className="w-4 h-4" />
                Create Assessment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a, i) => (
                <AssignmentCard key={a._id} assignment={a} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
