import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Sparkles, User, Mail, X, CornerDownRight, Quote } from 'lucide-react';
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
      {!sidebarMode && (
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-2xl font-display font-bold">Discussions</h2>
            <span className="bg-secondary px-2 py-0.5 rounded-full text-xs font-bold text-muted-foreground">
              {comments.length}
            </span>
          </div>
        </div>
      )}
      <div ref={formRef} className={cn(
        "bg-card/30 rounded-2xl border border-border/50 shadow-sm overflow-hidden",
        sidebarMode ? "p-4" : "p-6 sm:p-8"
      )}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {(replyTo || selection) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-[11px]"
              >
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-medium truncate">
                  {replyTo ? (
                    <><CornerDownRight className="w-3 h-3" /> Replying to {replyAuthor}</>
                  ) : (
                    <><Quote className="w-3 h-3" /> {formatQuote(selection?.text || "", 30)}</>
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Feedback..."
            className="min-h-[80px] bg-secondary/30 border-border/50 rounded-xl focus:ring-0 resize-none text-sm"
            required
          />
          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 h-9 bg-secondary/30 border-border/50 rounded-lg text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              size="sm"
              className="btn-gradient rounded-lg px-4 font-bold h-9"
            >
              Post <Send className="ml-2 w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-xl" />)}
          </div>
        ) : rootComments.length === 0 ? (
          <div className="text-center py-12 bg-secondary/10 rounded-2xl border-2 border-dashed border-border/40">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-xs">No comments yet.</p>
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