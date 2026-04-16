import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { Save, Loader2, ArrowLeft, RotateCcw, FileText, Hash, Clock, CheckCircle2, CircleDashed, Images } from 'lucide-react';
import { toast } from 'sonner';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ImageUploadButton } from '@/components/image-upload-button';
import { MediaLibraryDialog } from '@/components/media-library-dialog';
import { api, uploadImage, imageUrl, safeAlt } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
const DRAFT_KEY = 'markflow_draft';
const MAX_CLIENT_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
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
  const [mediaLibOpen, setMediaLibOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);
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

  /* ────── Image helpers ────── */

  /**
   * Insert markdown text at the current cursor position in the textarea.
   * Uses functional setContent to avoid stale-closure issues with `content`.
   */
  const insertAtCursor = useCallback((markdown: string) => {
    const el = textareaRef.current;

    // If textarea is missing or hidden (e.g. preview mode), append to end
    if (!el || el.offsetParent === null) {
      setContent((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + markdown + '\n');
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;

    setContent((prev) => {
      const before = prev.slice(0, start);
      const after = prev.slice(end);

      // Ensure surrounding newlines for visual separation
      const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
      const suffix = after.length > 0 && !after.startsWith('\n') ? '\n' : '';

      return before + prefix + markdown + suffix + after;
    });

    // Restore cursor after the inserted text
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + markdown.length + 2; // rough estimate accounting for newlines
      el.setSelectionRange(pos, pos);
    });
  }, []);

  /**
   * Upload one or more image Files in parallel and batch-insert all
   * markdown at once to avoid stale-content issues with sequential inserts.
   */
  const handleImageFiles = useCallback(async (files: File[]) => {
    // Filter to images, reject oversized files individually (don't abort entire batch)
    const imageFiles = files.filter((f) => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_CLIENT_IMAGE_SIZE) {
        toast.error(`${f.name} exceeds the 5 MB limit`);
        return false;
      }
      if (f.size === 0) {
        toast.error(`${f.name} is empty`);
        return false;
      }
      return true;
    });
    if (imageFiles.length === 0) return;

    const toastId = toast.loading(
      imageFiles.length === 1
        ? `Uploading ${imageFiles[0].name}...`
        : `Uploading ${imageFiles.length} images...`,
    );

    try {
      // Upload all files in parallel
      const results = await Promise.allSettled(imageFiles.map((f) => uploadImage(f)));
      toast.dismiss(toastId);

      const lines: string[] = [];
      let successCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const meta = result.value;
          const url = imageUrl(meta.id);
          lines.push(`![${safeAlt(meta.filename)}](${url})`);
          successCount++;
        } else {
          const msg = result.reason instanceof Error ? result.reason.message : 'Upload failed';
          toast.error(msg);
        }
      }

      if (lines.length > 0) {
        insertAtCursor(lines.join('\n'));
        toast.success(
          successCount === 1
            ? 'Image uploaded'
            : `${successCount} images uploaded`,
        );
      }
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    }
  }, [insertAtCursor]);

  /** Drag-and-drop handlers */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length > 0) handleImageFiles(files);
  }, [handleImageFiles]);

  /** Clipboard paste handler — intercepts image data only */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));
    if (imageItems.length === 0) return; // Let default paste handle text

    e.preventDefault();
    const files = imageItems
      .map((item, i) => {
        const f = item.getAsFile();
        if (!f) return null;
        // Pasted images typically get generic names like "image.png" — make them descriptive
        if (f.name === 'image.png' || f.name === 'image.jpeg' || f.name === 'blob') {
          const ext = f.type.split('/')[1]?.replace('svg+xml', 'svg') || 'png';
          return new File([f], `pasted-${Date.now()}-${i}.${ext}`, { type: f.type });
        }
        return f;
      })
      .filter((f): f is File => f !== null);
    if (files.length > 0) handleImageFiles(files);
  }, [handleImageFiles]);

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
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md z-[70] shrink-0">
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
          <ImageUploadButton onInsert={insertAtCursor} className="rounded-full" />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setMediaLibOpen(true)}
            aria-label="Open media library"
          >
            <Images className="w-4 h-4" />
          </Button>
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
        <div
          className={cn("flex-1 overflow-y-auto flex flex-col relative", viewMode === 'preview' ? "hidden lg:flex" : "flex", viewMode === 'write' ? "w-full" : "w-full md:w-1/2")}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className={cn("flex-1 px-4 pt-10 pb-32 md:pb-10 md:px-8 lg:px-12", viewMode === 'write' ? "max-w-4xl mx-auto w-full" : "")}>
            <TextareaAutosize
              ref={textareaRef}
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="# Start writing..."
              className="w-full min-h-full resize-none bg-transparent border-none focus:ring-0 font-mono text-base md:text-lg leading-relaxed placeholder:text-muted-foreground/20"
            />
          </div>

          {/* Drag-and-drop overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] border-2 border-dashed border-indigo-500 rounded-xl m-2 pointer-events-none"
              >
                <div className="flex flex-col items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Images className="w-10 h-10" />
                  <p className="text-sm font-bold">Drop images here to upload</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className={cn("flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/10 border-l border-border", viewMode === 'write' ? "hidden lg:flex" : "flex", viewMode === 'preview' ? "w-full" : "w-full md:w-1/2")}>
          <div className={cn("flex-1 px-6 pt-10 pb-32 md:pb-10 md:px-12 lg:px-16", viewMode === 'preview' ? "max-w-4xl mx-auto w-full" : "")}>
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
      <div className="lg:hidden fixed bottom-14 left-1/2 -translate-x-1/2 bg-card/90 border border-border shadow-2xl rounded-full p-1.5 flex items-center gap-1 z-[60] backdrop-blur-xl">
        {(['write', 'split', 'preview'] as const).map((mode) => (
          <Button key={mode} variant="ghost" size="sm" onClick={() => setViewMode(mode)} className={cn("h-10 px-5 rounded-full text-xs font-bold", viewMode === mode ? "bg-indigo-600 text-white" : "text-muted-foreground")}>
            {mode === 'write' ? 'Write' : mode === 'preview' ? 'View' : 'Split'}
          </Button>
        ))}
      </div>

      {/* Media Library Dialog */}
      <MediaLibraryDialog
        open={mediaLibOpen}
        onOpenChange={setMediaLibOpen}
        onInsert={insertAtCursor}
      />
    </div>
  );
}