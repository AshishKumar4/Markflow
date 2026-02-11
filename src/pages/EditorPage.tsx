import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { Save, Loader2, ArrowLeft, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  const [viewMode, setViewMode] = useState<'split' | 'write' | 'preview'>('split');
  const [hasDraft, setHasDraft] = useState(false);
  // Load document
  useEffect(() => {
    let isMounted = true;
    if (id) {
      setIsLoading(true);
      api<MarkdownDoc>(`/api/documents/${id}`)
        .then(doc => {
          if (!isMounted) return;
          setTitle(doc.title);
          setContent(doc.content);
          // Safety check for draft storage
          try {
            const savedDraft = localStorage.getItem(`${DRAFT_KEY}_${id}`);
            if (savedDraft) {
              const parsed = JSON.parse(savedDraft);
              if (parsed && (parsed.content !== doc.content || parsed.title !== doc.title)) {
                setHasDraft(true);
              }
            }
          } catch (e) {
            console.warn("Failed to parse local draft", e);
            localStorage.removeItem(`${DRAFT_KEY}_${id}`);
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Could not load document");
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      try {
        const savedDraft = localStorage.getItem(`${DRAFT_KEY}_new`);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.content || parsed.title)) {
            setHasDraft(true);
          }
        }
      } catch (e) {
        localStorage.removeItem(`${DRAFT_KEY}_new`);
      }
      setIsLoading(false);
    }
    return () => { isMounted = false; };
  }, [id]);
  // Persist draft
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      const key = id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`;
      if (content.trim() || title.trim()) {
        localStorage.setItem(key, JSON.stringify({ 
          title: title.trim(), 
          content, 
          timestamp: Date.now() 
        }));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [id, title, content, isLoading]);
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
      toast.error("Failed to restore draft: data corrupted");
      setHasDraft(false);
    }
  }, [id]);
  const discardDraft = useCallback(() => {
    const key = id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`;
    localStorage.removeItem(key);
    setHasDraft(false);
    toast.info("Draft discarded");
  }, [id]);
  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!content.trim()) {
      toast.error("Document content cannot be empty");
      return;
    }
    setIsSaving(true);
    try {
      const endpoint = id ? `/api/documents/${id}` : '/api/documents';
      const method = id ? 'PUT' : 'POST';
      const doc = await api<MarkdownDoc>(endpoint, {
        method,
        body: JSON.stringify({ title: trimmedTitle || 'Untitled', content }),
      });
      const key = id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`;
      localStorage.removeItem(key);
      setHasDraft(false);
      toast.success(id ? "Changes saved" : "Document published!");
      if (!id) navigate(`/d/${doc.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save document. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-muted-foreground font-medium animate-pulse">Preparing your studio...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 hover:bg-accent rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <input
              type="text"
              placeholder="Document Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-base sm:text-lg font-bold w-full max-w-[140px] sm:max-w-xs placeholder:text-muted-foreground/30 selection:bg-indigo-500/20"
            />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              <span>Cloud Sync Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden lg:flex items-center bg-secondary/50 rounded-full p-1 border border-border/50">
            {(['write', 'split', 'preview'] as const).map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "h-8 px-4 text-xs font-bold capitalize transition-all rounded-full",
                  viewMode === mode ? "bg-background text-indigo-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode}
              </Button>
            ))}
          </div>
          <ThemeToggle className="static shrink-0" />
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-gradient rounded-full px-4 sm:px-6 h-10 shadow-lg shadow-indigo-500/20 font-bold"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2 hidden sm:block" />
            )}
            {id ? 'Save' : 'Publish'}
          </Button>
        </div>
      </header>
      <AnimatePresence>
        {hasDraft && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600 text-white overflow-hidden shrink-0 z-40 relative shadow-md"
          >
            <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin-slow" />
                <span className="font-medium hidden sm:inline">We found an unsaved draft from your last session.</span>
                <span className="font-medium sm:hidden">Unsaved draft found.</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={restoreDraft} className="h-8 rounded-full text-xs font-bold px-4">
                  Restore
                </Button>
                <Button size="sm" variant="ghost" onClick={discardDraft} className="h-8 rounded-full text-xs text-white hover:bg-white/10 px-4">
                  Discard
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        <div className={cn(
          "flex-1 overflow-y-auto flex flex-col transition-all duration-300",
          viewMode === 'preview' ? "hidden lg:flex" : "flex",
          viewMode === 'write' ? "w-full" : "w-full md:w-1/2"
        )}>
          <div className={cn(
            "flex-1 px-4 py-10 md:px-8 lg:px-12",
            viewMode === 'write' ? "max-w-4xl mx-auto w-full" : ""
          )}>
            <TextareaAutosize
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Markdown starts here..."
              className="w-full min-h-full resize-none bg-transparent border-none focus:ring-0 font-mono text-base md:text-lg leading-relaxed placeholder:text-muted-foreground/20 selection:bg-indigo-500/20"
            />
          </div>
        </div>
        <div className={cn(
          "flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/10 border-l border-border transition-all duration-300",
          viewMode === 'write' ? "hidden lg:flex" : "flex",
          viewMode === 'preview' ? "w-full" : "w-full md:w-1/2"
        )}>
          <div className={cn(
            "flex-1 px-6 py-10 md:px-12 lg:px-16",
            viewMode === 'preview' ? "max-w-4xl mx-auto w-full" : ""
          )}>
            <MarkdownPreview content={content} proseSize="lg" />
          </div>
        </div>
      </main>
      {/* Mobile Control Bar */}
      <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 bg-card/90 border border-border shadow-2xl rounded-full p-1.5 flex items-center gap-1 z-50 backdrop-blur-xl ring-1 ring-black/5">
        {(['write', 'split', 'preview'] as const).map((mode) => (
          <Button
            key={mode}
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(mode)}
            className={cn(
              "h-10 px-5 rounded-full text-xs font-bold transition-all",
              viewMode === mode 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:text-white" 
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            {mode === 'write' ? 'Write' : mode === 'preview' ? 'View' : 'Split'}
          </Button>
        ))}
      </div>
    </div>
  );
}