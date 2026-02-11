import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit3, ArrowLeft, Loader2, Copy, Check, FileCode, ChevronRight, Home, Clock, MessageSquarePlus, Download, ArrowUp, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommentSection } from '@/components/comments/comment-section';
import { api } from '@/lib/api-client';
import type { MarkdownDoc, Comment } from '@shared/types';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
export function ViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<MarkdownDoc | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState<{ text: string; index: number } | null>(null);
  const [showAnnotate, setShowAnnotate] = useState(false);
  const [annotatePos, setAnnotatePos] = useState({ x: 0, y: 0 });
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const loadData = async () => {
      try {
        const [docData, commentsData] = await Promise.all([
          api<MarkdownDoc>(`/api/documents/${id}`),
          api<Comment[]>(`/api/comments/${id}`).catch(() => [] as Comment[])
        ]);
        if (isMounted) { setDoc(docData); setComments(commentsData); }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load document");
      } finally { if (isMounted) setIsLoading(false); }
    };
    loadData();
    return () => { isMounted = false; };
  }, [id]);
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim() && contentRef.current?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({ text: sel.toString().trim(), index: range.startOffset });
        setAnnotatePos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 48 });
        setShowAnnotate(true);
      } else { setShowAnnotate(false); }
    };
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('scroll', handleScroll);
    return () => { document.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('scroll', handleScroll); };
  }, []);
  const readingTime = useMemo(() => {
    if (!doc?.content) return 0;
    const words = doc.content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [doc?.content]);
  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;
  if (error || !doc) return <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
    <Home className="w-12 h-12 text-muted-foreground mb-4" />
    <h1 className="text-3xl font-bold mb-2">Document Missing</h1>
    <Button asChild className="rounded-full mt-4"><Link to="/">Go Home</Link></Button>
  </div>;
  return (
    <div className="min-h-screen bg-background pb-32">
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-indigo-600 z-[100] origin-left print:hidden" style={{ scaleX }} />
      <ThemeToggle className="print:hidden" />
      <AnimatePresence>
        {showAnnotate && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ left: annotatePos.x, top: annotatePos.y }} className="fixed z-[60] -translate-x-1/2 print:hidden">
            <Button size="sm" className="rounded-full shadow-2xl btn-gradient font-bold h-9 px-4" onClick={() => { setShowAnnotate(false); document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <MessageSquarePlus className="w-4 h-4 mr-2" /> Annotate
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showScrollTop && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 right-10 z-50 print:hidden">
            <Button variant="outline" size="icon" className="rounded-full w-12 h-12 bg-background/80 backdrop-blur-md shadow-xl" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <ArrowUp className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/docs')} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
              <ChevronRight className="w-3 h-3 opacity-50" />
              <span className="truncate max-w-[150px] text-foreground">{doc.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-full hidden md:flex"><Printer className="w-3.5 h-3.5 mr-2" /> Print</Button>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); toast.success("Link copied!"); setTimeout(() => setCopied(false), 2000); }} className="rounded-full">
              {copied ? <Check className="w-3.5 h-3.5 mr-2 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />} Share
            </Button>
            <Button asChild variant="secondary" size="sm" className="rounded-full font-bold"><Link to={`/edit/${doc.id}`}><Edit3 className="w-3.5 h-3.5 mr-2" /> Edit</Link></Button>
          </div>
        </div>
      </header>
      <motion.main initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="mb-14 md:mb-20">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black mb-8 tracking-tight leading-tight">{doc.title}</h1>
          <div className="flex flex-wrap items-center text-xs font-bold text-muted-foreground gap-8 uppercase tracking-widest">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> {isValid(new Date(doc.createdAt)) ? format(new Date(doc.createdAt), 'MMMM d, yyyy') : 'Recently'}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {readingTime} min read</div>
          </div>
        </div>
        <div ref={contentRef} className="print:text-black">
          <MarkdownPreview content={doc.content} proseSize="xl" comments={comments} onCommentClick={(cid) => { setActiveCommentId(cid); document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' }); }} />
        </div>
        <div className="print:hidden">
          <CommentSection docId={doc.id} selection={selection} onClearSelection={() => setSelection(null)} activeCommentId={activeCommentId} onClearActive={() => setActiveCommentId(null)} />
        </div>
      </motion.main>
    </div>
  );
}