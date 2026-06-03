'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  BookOpen,
  Zap,
  Shield,
  ArrowRight,
  FileText,
  Brain,
  Download,
  History,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Generation',
      desc: 'GPT-4 creates structured, curriculum-aligned question papers instantly.',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      icon: FileText,
      title: 'Structured Output',
      desc: 'Papers organized into sections with difficulty tags and mark allocations.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Zap,
      title: 'Real-Time Updates',
      desc: 'WebSocket progress tracking — know exactly when your paper is ready.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Download,
      title: 'PDF Export',
      desc: 'Download professionally formatted question papers with one click.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: History,
      title: 'Assignment History',
      desc: 'All your created assessments saved and accessible anytime.',
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
    },
    {
      icon: Shield,
      title: 'Validation Built-in',
      desc: 'Smart form validation ensures complete, well-defined assignment inputs.',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#0f0f13]/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">VedaAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/history" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5">
            History
          </Link>
          <Link
            href="/create"
            className="btn-primary text-sm py-2 px-4"
          >
            <Sparkles className="w-4 h-4" />
            Create Assessment
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-violet-600/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 text-sm text-primary-400 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Assessment Creator
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            Create Perfect
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-violet-400">
              Question Papers
            </span>
            <br />
            in Seconds
          </h1>

          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your syllabus, set your requirements, and let AI generate a fully structured,
            difficulty-tagged question paper — ready to print or download as PDF.
          </p>

          <div className="flex items-center justify-center gap-4">
            <motion.button
              onClick={() => router.push('/create')}
              className="btn-primary text-base py-3.5 px-8"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles className="w-5 h-5" />
              Start Creating
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <Link href="/history" className="btn-secondary text-base py-3.5 px-8">
              <BookOpen className="w-5 h-5" />
              View History
            </Link>
          </div>
        </motion.div>

        {/* Demo card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <div className="glass-card p-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-slate-500 ml-2">Generated Question Paper Preview</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 bg-slate-700 rounded w-48"></div>
                <div className="h-3 bg-primary-500/30 rounded w-20"></div>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <div className="text-xs text-slate-500 mb-2">Section A — Short Answer</div>
                {[
                  { diff: 'easy', color: 'text-emerald-400 bg-emerald-500/10' },
                  { diff: 'medium', color: 'text-amber-400 bg-amber-500/10' },
                  { diff: 'hard', color: 'text-rose-400 bg-rose-500/10' },
                ].map((q, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs text-slate-500">Q{i + 1}.</span>
                    <div className="h-2.5 bg-slate-700 rounded flex-1"></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${q.color}`}>{q.diff}</span>
                    <span className="text-xs text-slate-500">5m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Everything You Need</h2>
          <p className="text-slate-400 text-center mb-12">Built for educators, powered by AI</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="glass-card p-5 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card p-10">
            <Sparkles className="w-10 h-10 text-primary-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">Ready to Get Started?</h2>
            <p className="text-slate-400 mb-8">
              Create your first AI-generated assessment in under 2 minutes.
            </p>
            <motion.button
              onClick={() => router.push('/create')}
              className="btn-primary mx-auto text-base py-3.5 px-8"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles className="w-5 h-5" />
              Create Assessment Now
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-slate-600">
        <p>VedaAI Assessment Creator — Built with Next.js, Express, BullMQ & GPT-4</p>
      </footer>
    </div>
  );
}
