import React, { useState, useEffect, useCallback } from 'react';
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
    if (id) {
      setIsLoading(true);
      api<MarkdownDoc>(`/api/documents/${id}`)
        .then(doc => {
          setTitle(doc.title);
          setContent(doc.content);
          // Check for draft after server data is loaded
          const savedDraft = localStorage.getItem(`${DRAFT_KEY}_${id}`);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed.content !== doc.content || parsed.title !== doc.title) {
              setHasDraft(true);
            }
          }
        })
        .catch(err => {
          console.error(err);
          toast.error("Could not load document");
        })
        .finally(() => setIsLoading(false));
    } else {
      // For new docs
      const savedDraft = localStorage.getItem(`${DRAFT_KEY}_new`);
      if (savedDraft) {
        setHasDraft(true);
      }
    }
  }, [id]);
  // Persist draft
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      const key = id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`;
      if (content.trim() || title.trim()) {
        localStorage.setItem(key, JSON.stringify({ title, content, timestamp: Date.now() }));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [id, title, content, isLoading]);
  const restoreDraft = useCallback(() => {
    const key = id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`;
    const savedDraft = localStorage.getItem(key);
    if (savedDraft) {
      const { title: dTitle, content: dContent } = JSON.parse(savedDraft);
      setTitle(dTitle);
      setContent(dContent);
      setHasDraft(false);
      toast.success("Draft restored");
    }
  }, [id]);
  const discardDraft = useCallback(() => {
    const key = id ? `${DRAFT_KEY}_${id}` : `${DRAFT_KEY}_new`;
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [id]);
  const handleSave = async () => {
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
        body: JSON.stringify({ title: title || 'Untitled', content }),
      });
      // Success: clear draft
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
          <p className="text-muted-foreground font-medium animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <input
              type="text"
              placeholder="Document Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-base sm:text-lg font-bold w-full max-w-[120px] sm:max-w-xs placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 uppercase tracking-tighter sm:tracking-normal">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Autosaving Draft</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden lg:flex items-center bg-secondary/50 rounded-xl p-1 border border-border/50">
            {(['write', 'split', 'preview'] as const).map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "h-8 px-4 text-xs font-semibold capitalize transition-all rounded-lg",
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
            className="btn-gradient rounded-full px-4 sm:px-6 h-10 shadow-lg shadow-indigo-500/10"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2 hidden sm:block" />
            )}
            {id ? 'Save Changes' : 'Publish'}
          </Button>
        </div>
      </header>
      <AnimatePresence>
        {hasDraft && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600 text-white overflow-hidden shrink-0"
          >
            <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span className="font-medium">Unsaved changes found in local draft.</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={restoreDraft} className="h-8 rounded-full text-xs font-bold">
                  Restore
                </Button>
                <Button size="sm" variant="ghost" onClick={discardDraft} className="h-8 rounded-full text-xs text-white hover:bg-white/10">
                  Discard
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        <div className={cn(
          "flex-1 overflow-y-auto flex flex-col",
          viewMode === 'preview' ? "hidden lg:flex" : "flex",
          viewMode === 'write' ? "w-full" : "w-full md:w-1/2"
        )}>
          <div className={cn(
            "flex-1 px-4 py-8 md:px-8 lg:px-12",
            viewMode === 'write' ? "max-w-4xl mx-auto w-full" : ""
          )}>
            <TextareaAutosize
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Start with a heading..."
              className="w-full min-h-full resize-none bg-transparent border-none focus:ring-0 font-mono text-base md:text-lg leading-relaxed placeholder:text-muted-foreground/30 selection:bg-indigo-500/20"
            />
          </div>
        </div>
        <div className={cn(
          "flex-1 overflow-y-auto bg-card/30 border-l border-border transition-colors duration-300",
          viewMode === 'write' ? "hidden lg:flex" : "flex",
          viewMode === 'preview' ? "w-full" : "w-full md:w-1/2"
        )}>
          <div className={cn(
            "flex-1 px-6 py-8 md:px-12 lg:px-16",
            viewMode === 'preview' ? "max-w-4xl mx-auto w-full" : ""
          )}>
            <MarkdownPreview content={content} proseSize="lg" />
          </div>
        </div>
      </main>
      {/* Mobile Mode Switcher */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-2xl rounded-full p-1.5 flex items-center gap-1 z-50 backdrop-blur-md">
        {(['write', 'split', 'preview'] as const).map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode(mode)}
            className={cn(
              "h-9 px-4 rounded-full text-xs font-bold transition-all",
              viewMode === mode ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-600" : ""
            )}
          >
            {mode}
          </Button>
        ))}
      </div>
    </div>
  );
}