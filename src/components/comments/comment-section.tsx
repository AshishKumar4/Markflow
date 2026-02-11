import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, User, X, CornerDownRight, Quote, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CommentItem } from './comment-item';
import { api } from '@/lib/api-client';
import { markCommentOwned, cn, formatQuote } from '@/lib/utils';
import type { Comment } from '@shared/types';
interface CommentSectionProps {
  docId: string;
  selection?: { text: string; index: number } | null;
  onClearSelection?: () => void;
  activeCommentId?: string | null;
  onClearActive?: () => void;
  sidebarMode?: boolean;
}
export function CommentSection({
  docId,
  selection,
  onClearSelection,
  activeCommentId,
  onClearActive,
  sidebarMode = false
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fetchComments = useCallback(async () => {
    try {
      const data = await api<Comment[]>(`/api/comments/${docId}`);
      setComments(data);
    } catch (err) {
      toast.error("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [docId]);
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);
  useEffect(() => {
    if (selection) {
      setReplyTo(null);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [selection]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const newComment = await api<Comment>(`/api/comments/${docId}`, {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          authorName: name || undefined,
          authorEmail: email || undefined,
          parentId: replyTo || undefined,
          position: selection || undefined,
        }),
      });
      setComments(prev => [...prev, newComment]);
      markCommentOwned(newComment.id);
      setContent('');
      setReplyTo(null);
      onClearSelection?.();
      toast.success("Comment posted!");
    } catch (err) {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      await api(`/api/comments/${docId}/${id}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c.id !== id));
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };
  const rootComments = useMemo(() =>
    comments.filter(c => !c.parentId).sort((a, b) => b.createdAt - a.createdAt),
  [comments]);
  const getReplies = (parentId: string) =>
    comments.filter(c => c.parentId === parentId).sort((a, b) => a.createdAt - b.createdAt);
  const replyAuthor = useMemo(() => {
    if (!replyTo) return null;
    return comments.find(c => c.id === replyTo)?.authorName || 'Anonymous';
  }, [replyTo, comments]);
  return (
    <div className={cn("space-y-6", sidebarMode ? "p-0" : "mt-20")}>
      <motion.div
        layout
        ref={formRef}
        animate={activeCommentId ? { scale: [1, 1.01, 1] } : {}}
        className={cn(
          "bg-card/40 rounded-2xl border transition-all duration-500 overflow-hidden",
          selection ? "border-indigo-500/50 ring-4 ring-indigo-500/5 shadow-xl" : "border-border/50",
          sidebarMode ? "p-4" : "p-6 sm:p-8"
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {(replyTo || selection) && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-lg text-[11px]"
              >
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-medium truncate">
                  {replyTo ? (
                    <><CornerDownRight className="w-3 h-3" /> Replying to {replyAuthor}</>
                  ) : (
                    <><Quote className="w-3 h-3" /> {formatQuote(selection?.text || "", 40)}</>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={() => { setReplyTo(null); onClearSelection?.(); }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={selection ? "Add your annotation..." : "Join the discussion..."}
            className="min-h-[100px] bg-secondary/30 border-border/50 rounded-xl focus:ring-0 resize-none text-sm leading-relaxed"
            required
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Your Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 h-10 bg-secondary/30 border-border/50 rounded-lg text-xs"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="btn-gradient rounded-lg px-6 font-bold h-10 shadow-indigo-500/20"
            >
              Post <Send className="ml-2 w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      </motion.div>
      <div className="space-y-4 relative">
        <AnimatePresence>
          {activeCommentId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-2 bg-indigo-500/5 rounded-3xl -z-10 pointer-events-none border border-indigo-500/10"
            />
          )}
        </AnimatePresence>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/30 animate-pulse rounded-2xl" />)}
          </div>
        ) : rootComments.length === 0 ? (
          <div className="text-center py-20 bg-secondary/10 rounded-[2rem] border-2 border-dashed border-border/40">
            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Sparkles className="w-8 h-8 text-indigo-200" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No discussions yet</h3>
            <p className="text-muted-foreground text-xs mt-1">Be the first to share your thoughts.</p>
          </div>
        ) : (
          rootComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              isHighlighted={activeCommentId === comment.id}
              onReply={setReplyTo}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}