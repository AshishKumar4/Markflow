import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { Save, Loader2, ArrowLeft, RotateCcw, FileText, Hash, Clock, CheckCircle2, CircleDashed } from 'lucide-react';
import { toast } from 'sonner';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
const DRAFT_KEY = 'markflow_draft';
export function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [lastSavedTitle, setLastSavedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  const [viewMode, setViewMode] = useState<'split' | 'write' | 'preview'>('split');
  const [hasDraft, setHasDraft] = useState(false);
  const isDirty = useMemo(() => {
    return content !== lastSavedContent || title !== lastSavedTitle;
  }, [content, title, lastSavedContent, lastSavedTitle]);
  const stats = useMemo(() => {
    const text = content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTime };
  }, [content]);
  useEffect(() => {
    let isMounted = true;
    if (id) {
      setIsLoading(true);
      api<MarkdownDoc>(`/api/documents/${id}`)
        .then(doc => {
          if (!isMounted) return;
          setTitle(doc.title);
          setContent(doc.content);
          setLastSavedTitle(doc.title);
          setLastSavedContent(doc.content);
          try {
            const savedDraft = localStorage.getItem(`${DRAFT_KEY}_${id}`);
            if (savedDraft) {
              const parsed = JSON.parse(savedDraft);
              if (parsed && (parsed.content !== doc.content || parsed.title !== doc.title)) {
                setHasDraft(true);
              }
            }
          } catch (e) {
            localStorage.removeItem(`${DRAFT_KEY}_${id}`);
          }
        })
        .catch(() => toast.error("Could not load document"))
        .finally(() => { if (isMounted) setIsLoading(false); });
    } else {
      try {
        const savedDraft = localStorage.getItem(`${DRAFT_KEY}_new`);
        if (savedDraft) setHasDraft(true);
      } catch (e) {
        localStorage.removeItem(`${DRAFT_KEY}_new`);
      }
      setIsLoading(false);
    }
    return () => { isMounted = false; };
  }, [id]);
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      const key = id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`;
      if (content.trim() || title.trim()) {
        localStorage.setItem(key, JSON.stringify({ title: title.trim(), content, timestamp: Date.now() }));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [id, title, content, isLoading]);
  const handleSave = async () => {
    if (!content.trim()) return toast.error("Document content cannot be empty");
    setIsSaving(true);
    try {
      const endpoint = id ? `/api/documents/${id}` : '/api/documents';
      const method = id ? 'PUT' : 'POST';
      const doc = await api<MarkdownDoc>(endpoint, {
        method,
        body: JSON.stringify({ title: title.trim() || 'Untitled', content }),
      });
      setLastSavedTitle(doc.title);
      setLastSavedContent(doc.content);
      localStorage.removeItem(id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`);
      setHasDraft(false);
      toast.success(id ? "Changes saved" : "Document published!");
      if (!id) navigate(`/d/${doc.id}`);
    } catch (err) {
      toast.error("Failed to save document.");
    } finally {
      setIsSaving(false);
    }
  };
  useHotkeys('mod+s', (e) => {
    e.preventDefault();
    handleSave();
  }, { enableOnFormTags: true }, [handleSave]);
  const restoreDraft = useCallback(() => {
    try {
      const key = id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`;
      const savedDraft = localStorage.getItem(key);
      if (savedDraft) {
        const { title: dTitle, content: dContent } = JSON.parse(savedDraft);
        setTitle(dTitle || '');
        setContent(dContent || '');
        setHasDraft(false);
        toast.success("Draft restored");
      }
    } catch (e) {
      setHasDraft(false);
    }
  }, [id]);
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-muted-foreground font-medium animate-pulse">Opening Studio...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md z-50 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col min-w-0">
            <input
              type="text"
              placeholder="Document Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-base sm:text-lg font-bold w-full max-w-xs placeholder:text-muted-foreground/30 truncate"
            />
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
              {isDirty ? (
                <span className="flex items-center gap-1 text-amber-500"><CircleDashed className="w-2.5 h-2.5" /> Unsaved Changes</span>
              ) : (
                <span className="flex items-center gap-1 text-green-500"><CheckCircle2 className="w-2.5 h-2.5" /> All Saved</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="hidden lg:flex items-center bg-secondary/50 rounded-full p-1 border border-border/50">
            {(['write', 'split', 'preview'] as const).map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "h-8 px-4 text-xs font-bold capitalize rounded-full",
                  viewMode === mode ? "bg-background text-indigo-600 shadow-sm" : "text-muted-foreground"
                )}
              >
                {mode}
              </Button>
            ))}
          </div>
          <ThemeToggle className="static" />
          <Button onClick={handleSave} disabled={isSaving} className="btn-gradient rounded-full px-6 h-10 font-bold">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2 hidden sm:block" />}
            {id ? 'Save' : 'Publish'}
          </Button>
        </div>
      </header>
      <AnimatePresence>
        {hasDraft && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-indigo-600 text-white overflow-hidden shrink-0 z-40">
            <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-2"><RotateCcw className="w-3.5 h-3.5" /> Local draft found</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={restoreDraft} className="h-7 rounded-full px-3 text-[10px] font-black">Restore</Button>
                <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem(id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`); setHasDraft(false); }} className="h-7 text-white hover:bg-white/10 text-[10px]">Discard</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        <div className={cn("flex-1 overflow-y-auto flex flex-col", viewMode === 'preview' ? "hidden lg:flex" : "flex", viewMode === 'write' ? "w-full" : "w-full md:w-1/2")}>
          <div className={cn("flex-1 px-4 py-10 md:px-8 lg:px-12", viewMode === 'write' ? "max-w-4xl mx-auto w-full" : "")}>
            <TextareaAutosize
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Start writing..."
              className="w-full min-h-full resize-none bg-transparent border-none focus:ring-0 font-mono text-base md:text-lg leading-relaxed placeholder:text-muted-foreground/20"
            />
          </div>
        </div>
        <div className={cn("flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/10 border-l border-border", viewMode === 'write' ? "hidden lg:flex" : "flex", viewMode === 'preview' ? "w-full" : "w-full md:w-1/2")}>
          <div className={cn("flex-1 px-6 py-10 md:px-12 lg:px-16", viewMode === 'preview' ? "max-w-4xl mx-auto w-full" : "")}>
            <MarkdownPreview content={content} proseSize="lg" />
          </div>
        </div>
      </main>
      <footer className="h-10 border-t border-border bg-card/50 flex items-center justify-between px-6 text-[10px] text-muted-foreground font-bold uppercase tracking-widest z-50 shrink-0">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> {stats.words} Words</span>
          <span className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> {stats.chars} Chars</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {stats.readingTime} Min</span>
        </div>
        <div className="hidden sm:block">Press <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">Ctrl+S</kbd> to save</div>
      </footer>
      <div className="lg:hidden fixed bottom-14 left-1/2 -translate-x-1/2 bg-card/90 border border-border shadow-2xl rounded-full p-1.5 flex items-center gap-1 z-50 backdrop-blur-xl">
        {(['write', 'split', 'preview'] as const).map((mode) => (
          <Button key={mode} variant="ghost" size="sm" onClick={() => setViewMode(mode)} className={cn("h-10 px-5 rounded-full text-xs font-bold", viewMode === mode ? "bg-indigo-600 text-white" : "text-muted-foreground")}>
            {mode === 'write' ? 'Write' : mode === 'preview' ? 'View' : 'Split'}
          </Button>
        ))}
      </div>
    </div>
  );
}