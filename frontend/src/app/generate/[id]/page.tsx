'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, XCircle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAssignmentStore } from '@/store/assignmentStore';
import { AssessmentWebSocket } from '@/lib/websocket';
import { getAssignmentStatus, getAssignment } from '@/lib/api';
import { JobState } from '@/types';
import toast from 'react-hot-toast';

const STEPS = [
  { label: 'Request received', threshold: 0 },
  { label: 'Analyzing input', threshold: 20 },
  { label: 'Building prompt', threshold: 35 },
  { label: 'AI generating questions', threshold: 50 },
  { label: 'Parsing response', threshold: 75 },
  { label: 'Saving to database', threshold: 90 },
  { label: 'Done!', threshold: 100 },
];

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { currentJob, setJobState, setGeneratedPaper } = useAssignmentStore();
  const [localJob, setLocalJob] = useState<JobState | null>(currentJob);
  const wsRef = useRef<AssessmentWebSocket | null>(null);
  const pollerRef = useRef<NodeJS.Timeout | null>(null);
  const redirectedRef = useRef(false);

  const handleJobUpdate = (state: JobState) => {
    setLocalJob(state);
    setJobState(state);

    if (state.status === 'completed' && state.result && !redirectedRef.current) {
      redirectedRef.current = true;
      setGeneratedPaper(state.result);
      toast.success('Question paper generated!');
      setTimeout(() => router.push(`/result/${id}`), 800);
    }
    if (state.status === 'failed') {
      toast.error(state.error || 'Generation failed');
    }
  };

  useEffect(() => {
    if (!id) return;

    // Initialize local state
    if (!localJob) {
      setLocalJob({
        jobId: '',
        assignmentId: id,
        status: 'waiting',
        progress: 0,
        message: 'Connecting...',
      });
    }

    // Connect WebSocket
    const ws = new AssessmentWebSocket(id);
    wsRef.current = ws;
    ws.connect();

    const unsub1 = ws.on('job_update', handleJobUpdate);
    const unsub2 = ws.on('job_complete', handleJobUpdate);
    const unsub3 = ws.on('job_error', handleJobUpdate);

    // Polling fallback (in case WS misses an update)
    pollerRef.current = setInterval(async () => {
      try {
        const data = await getAssignmentStatus(id);
        const status = data.data.status;

        if (status === 'completed' && !redirectedRef.current) {
          redirectedRef.current = true;
          clearInterval(pollerRef.current!);
          ws.disconnect();

          // Fetch the full paper
          const full = await getAssignment(id);
          if (full.data.generatedPaper) {
            setGeneratedPaper(full.data.generatedPaper);
          }
          toast.success('Question paper generated!');
          setTimeout(() => router.push(`/result/${id}`), 300);
        }

        if (status === 'failed') {
          clearInterval(pollerRef.current!);
          setLocalJob((prev) =>
            prev ? { ...prev, status: 'failed', message: 'Generation failed' } : prev
          );
        }
      } catch {
        // silently ignore poll errors
      }
    }, 3000);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      ws.disconnect();
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [id]);

  const progress = localJob?.progress || 0;
  const status = localJob?.status || 'waiting';
  const message = localJob?.message || 'Waiting...';

  const currentStepIndex = STEPS.filter((s) => progress >= s.threshold).length - 1;

  const dots = [0, 1, 2];

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center"
        >
          {/* Icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            {status === 'completed' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </motion.div>
            ) : status === 'failed' ? (
              <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-rose-400" />
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center animate-pulse-slow">
                  <Sparkles className="w-10 h-10 text-primary-400" />
                </div>
                {/* Orbit dots */}
                {dots.map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2.5 h-2.5 bg-primary-400 rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                      marginTop: -5,
                      marginLeft: -5,
                    }}
                    animate={{
                      x: Math.cos((i * 2 * Math.PI) / 3) * 38,
                      y: Math.sin((i * 2 * Math.PI) / 3) * 38,
                      rotate: 360,
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            {status === 'completed'
              ? 'Paper Generated!'
              : status === 'failed'
              ? 'Generation Failed'
              : 'Generating Your Paper'}
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            {status === 'completed'
              ? 'Redirecting to your question paper...'
              : status === 'failed'
              ? 'Something went wrong. Please try again.'
              : message}
          </p>

          {/* Progress Bar */}
          {status !== 'failed' && (
            <div className="mb-8">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-600 to-violet-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2.5 text-left mb-8">
            {STEPS.slice(0, -1).map((step, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex && status === 'active';
              return (
                <div key={step.label} className={`flex items-center gap-3 text-sm transition-all duration-300
                  ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-600'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                    ${done
                      ? 'bg-emerald-500/20 border border-emerald-500/50'
                      : active
                      ? 'bg-primary-500/20 border border-primary-500/50'
                      : 'bg-slate-800 border border-slate-700'
                    }`}>
                    {done ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : active ? (
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                    )}
                  </div>
                  {step.label}
                  {active && (
                    <span className="ml-auto flex gap-0.5">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="w-1 h-1 bg-primary-400 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          {status === 'failed' && (
            <div className="flex gap-3 justify-center">
              <Link href="/create" className="btn-secondary text-sm">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Link>
            </div>
          )}

          {status === 'completed' && (
            <Link href={`/result/${id}`} className="btn-primary w-full justify-center">
              View Question Paper
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {(status === 'waiting' || status === 'active') && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                This usually takes 15–30 seconds
              </div>
            </div>
          )}
        </motion.div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Assignment ID: {id}
        </p>
      </div>
    </div>
  );
}
