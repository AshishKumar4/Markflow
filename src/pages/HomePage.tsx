import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PenLine, FileText, Share2, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
export function HomePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ThemeToggle />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="py-20 md:py-28 lg:py-36 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>The simplest way to share Markdown</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-6xl md:text-8xl font-display font-bold tracking-tight mb-6"
          >
            Mark<span className="text-gradient">Flow</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty"
          >
            Write, preview, and publish beautiful documents instantly. No accounts, no clutter, just pure content.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button asChild size="lg" className="btn-gradient rounded-full h-14 px-8 text-lg group">
              <Link to="/new">
                Start Writing
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full h-14 px-8 text-lg" asChild>
              <Link to="/docs">View Directory</Link>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl"
          >
            <FeatureCard
              icon={<PenLine className="w-6 h-6" />}
              title="Markdown Studio"
              description="Rich editor with real-time preview and GitHub Flavored Markdown support."
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Typography First"
              description="Your content rendered with pixel-perfect attention to readability."
            />
            <FeatureCard
              icon={<Share2 className="w-6 h-6" />}
              title="Instant Sharing"
              description="Publish with one click and get a permanent, clean URL for your audience."
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover:border-indigo-500/50 transition-colors text-left group">
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}