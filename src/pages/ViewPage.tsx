import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit3, ArrowLeft, Loader2, Copy, Check, FileCode, ChevronRight, Home, Clock, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommentSection } from '@/components/comments/comment-section';
import { api } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
import { motion, AnimatePresence } from 'framer-motion';
export function ViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<MarkdownDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [selection, setSelection] = useState<{ text: string; index: number } | null>(null);
  const [showAnnotate, setShowAnnotate] = useState(false);
  const [annotatePos, setAnnotatePos] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);
    api<MarkdownDoc>(`/api/documents/${id}`)
      .then(data => {
        if (isMounted) setDoc(data);
      })
      .catch(() => {
        if (isMounted) toast.error("Document not found");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [id]);
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim() && contentRef.current?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
          text: sel.toString().trim(),
          index: 0, // Simplified index tracking
        });
        setAnnotatePos({
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY - 40,
        });
        setShowAnnotate(true);
      } else {
        setShowAnnotate(false);
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);
  const readingTime = useMemo(() => {
    if (!doc?.content) return 0;
    const words = doc.content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [doc?.content]);
  const formattedDate = useMemo(() => {
    if (!doc?.createdAt) return 'Recently';
    const date = new Date(doc.createdAt);
    return isValid(date) ? format(date, 'MMMM d, yyyy') : 'Recently';
  }, [doc?.createdAt]);
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };
  const handleCopyRaw = () => {
    if (!doc?.content) return;
    try {
      navigator.clipboard.writeText(doc.content);
      setCopiedRaw(true);
      toast.success("Markdown copied!");
      setTimeout(() => setCopiedRaw(false), 2000);
    } catch (err) {
      toast.error("Failed to copy content");
    }
  };
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-muted-foreground font-medium animate-pulse">Rendering Document...</p>
        </div>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-4 tracking-tight">404: Not Found</h1>
          <p className="text-muted-foreground mb-8 text-center max-w-sm mx-auto">This document might have been deleted or the link is broken.</p>
          <Button asChild size="lg" className="rounded-full px-10 btn-gradient">
            <Link to="/">Back to Home</Link>
          </Button>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background pb-32 selection:bg-indigo-500/10 transition-colors duration-500">
      <ThemeToggle />
      <AnimatePresence>
        {showAnnotate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ left: annotatePos.x, top: annotatePos.y }}
            className="fixed z-[60] -translate-x-1/2"
          >
            <Button 
              size="sm" 
              className="rounded-full shadow-2xl btn-gradient font-bold h-9 px-4 gap-2"
              onClick={() => {
                setShowAnnotate(false);
                document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <MessageSquarePlus className="w-4 h-4" />
              Comment on selection
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/docs')} className="rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
              <ChevronRight className="w-3 h-3 opacity-50" />
              <span className="truncate max-w-[150px] text-foreground">{doc.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyRaw} className="rounded-full hidden sm:flex border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-all font-semibold">
              {copiedRaw ? <Check className="w-3.5 h-3.5 mr-2 text-green-500" /> : <FileCode className="w-3.5 h-3.5 mr-2" />}
              Raw
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="rounded-full border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-all font-semibold">
              {copied ? <Check className="w-3.5 h-3.5 mr-2 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
              Share
            </Button>
            <Button asChild variant="secondary" size="sm" className="rounded-full shadow-sm font-bold border border-transparent hover:border-indigo-500/30">
              <Link to={`/edit/${doc.id}`}>
                <Edit3 className="w-3.5 h-3.5 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-6 py-16 md:py-24"
      >
        <div className="mb-14 md:mb-20">
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-6">
             <div className="h-[2px] w-12 bg-current rounded-full" />
             <span>MarkFlow Publication</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black mb-8 tracking-tight leading-[1.05] text-foreground text-pretty">
            {doc.title}
          </h1>
          <div className="flex flex-wrap items-center text-sm font-bold text-muted-foreground gap-y-3 gap-x-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{readingTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              <span>Markdown</span>
            </div>
          </div>
        </div>
        <div ref={contentRef}>
          <MarkdownPreview content={doc.content} proseSize="xl" className="font-sans antialiased" />
        </div>
        <CommentSection 
          docId={doc.id} 
          selection={selection} 
          onClearSelection={() => setSelection(null)} 
        />
        <footer className="mt-28 pt-16 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="space-y-4 text-center md:text-left">
              <Link to="/" className="flex items-center justify-center md:justify-start gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">M</div>
                <h2 className="text-3xl font-display font-bold tracking-tight">
                  Mark<span className="text-indigo-600">Flow</span>
                </h2>
              </Link>
              <p className="text-muted-foreground max-w-sm text-lg leading-relaxed font-medium">
                The fastest way to write and publish beautiful Markdown documents.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-5">
              <Button asChild className="btn-gradient rounded-full px-10 h-14 text-base font-bold shadow-2xl shadow-indigo-500/30">
                <Link to="/new">Create your own</Link>
              </Button>
              <Button asChild variant="ghost" className="text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/5 font-bold gap-2 rounded-full">
                <Link to="/"><Home className="w-4 h-4" /> Go to Home</Link>
              </Button>
            </div>
          </div>
        </footer>
      </motion.main>
      <AnimatePresence>
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-8 right-8 flex flex-col gap-4 sm:hidden z-50">
           <Button onClick={handleCopyRaw} size="icon" className="w-14 h-14 rounded-full shadow-2xl bg-card border border-border text-foreground hover:bg-accent">
              {copiedRaw ? <Check className="w-6 h-6 text-green-500" /> : <FileCode className="w-6 h-6" />}
           </Button>
           <Button asChild size="icon" className="w-14 h-14 rounded-full shadow-2xl btn-gradient">
            <Link to={`/edit/${doc.id}`}>
              <Edit3 className="w-6 h-6" />
            </Link>
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}