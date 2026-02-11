import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit3, ArrowLeft, Loader2, Copy, Check, FileCode, ChevronRight, Home } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
import { motion } from 'framer-motion';
export function ViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<MarkdownDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api<MarkdownDoc>(`/api/documents/${id}`)
      .then(setDoc)
      .catch(() => toast.error("Document not found"))
      .finally(() => setIsLoading(false));
  }, [id]);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  const handleCopyRaw = () => {
    if (!doc) return;
    navigator.clipboard.writeText(doc.content);
    setCopiedRaw(true);
    toast.success("Markdown source copied");
    setTimeout(() => setCopiedRaw(false), 2000);
  };
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <h1 className="text-3xl font-display font-bold mb-4 tracking-tight text-gradient">Content Not Found</h1>
        <p className="text-muted-foreground mb-8 text-center max-w-sm">This document may have been removed or the link is incorrect.</p>
        <Button asChild variant="outline" className="rounded-full px-8">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background pb-32 selection:bg-indigo-500/10">
      <ThemeToggle />
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/docs')} className="rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Link to="/docs" className="hover:text-primary transition-colors">Directory</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{doc.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyRaw} className="rounded-full hidden sm:flex border-border/50 bg-secondary/30">
              {copiedRaw ? <Check className="w-3.5 h-3.5 mr-2" /> : <FileCode className="w-3.5 h-3.5 mr-2" />}
              Raw
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="rounded-full border-border/50 bg-secondary/30">
              {copied ? <Check className="w-3.5 h-3.5 mr-2" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
              Share
            </Button>
            <Button asChild variant="secondary" size="sm" className="rounded-full shadow-sm">
              <Link to={`/edit/${doc.id}`}>
                <Edit3 className="w-3.5 h-3.5 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-3xl mx-auto px-6 py-16 md:py-24"
      >
        <div className="mb-12 md:mb-16">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-4">
             <div className="h-1 w-8 bg-current rounded-full" />
             Published via MarkFlow
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight leading-[1.1] text-foreground">
            {doc.title}
          </h1>
          <div className="flex items-center text-sm font-medium text-muted-foreground gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>{doc.createdAt ? format(doc.createdAt, 'MMMM d, yyyy') : 'Recently'}</span>
            </div>
            <span>•</span>
            <span>{Math.ceil((doc.content?.split(/\s+/).length || 0) / 200)} min read</span>
          </div>
        </div>
        <MarkdownPreview content={doc.content} proseSize="xl" />
        <footer className="mt-24 pt-16 border-t border-border/60">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">M</div>
                <h2 className="text-3xl font-display font-bold tracking-tight">
                  Mark<span className="text-indigo-600">Flow</span>
                </h2>
              </div>
              <p className="text-muted-foreground max-w-sm text-lg leading-relaxed">
                A simple, distraction-free space for your thoughts, docs, and code.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-4">
              <Button asChild className="btn-gradient rounded-full px-8 h-12 text-base font-bold shadow-xl shadow-indigo-500/20">
                <Link to="/new">Create your own doc</Link>
              </Button>
              <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary gap-2">
                <Link to="/"><Home className="w-4 h-4" /> Back to Home</Link>
              </Button>
            </div>
          </div>
        </footer>
      </motion.main>
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 sm:hidden">
         <Button onClick={handleCopyRaw} size="icon" className="w-14 h-14 rounded-full shadow-2xl bg-secondary border border-border text-foreground">
            <FileCode className="w-6 h-6" />
         </Button>
         <Button asChild size="icon" className="w-14 h-14 rounded-full shadow-2xl btn-gradient">
          <Link to={`/edit/${doc.id}`}>
            <Edit3 className="w-6 h-6" />
          </Link>
        </Button>
      </div>
    </div>
  );
}