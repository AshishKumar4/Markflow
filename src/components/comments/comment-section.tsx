import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Sparkles, User, Mail, X, CornerDownRight, Quote } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CommentItem } from './comment-item';
import { api } from '@/lib/api-client';
import { markCommentOwned } from '@/lib/utils';
import type { Comment } from '@shared/types';
import { cn } from '@/lib/utils';
interface CommentSectionProps {
  docId: string;
  selection?: { text: string; index: number } | null;
  onClearSelection?: () => void;
}
export function CommentSection({ docId, selection, onClearSelection }: CommentSectionProps) {
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
      console.error(err);
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
    <section className="mt-20 space-y-10" id="comments">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold">Discussions</h2>
          <span className="bg-secondary px-2.5 py-0.5 rounded-full text-xs font-bold text-muted-foreground border border-border/50">
            {comments.length}
          </span>
        </div>
      </div>
      <div ref={formRef} className="bg-card/30 rounded-3xl p-6 sm:p-8 border border-border/50 shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="popLayout">
            {(replyTo || selection) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-sm"
              >
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-medium">
                  {replyTo ? (
                    <><CornerDownRight className="w-4 h-4" /> Replying to {replyAuthor}</>
                  ) : (
                    <><Quote className="w-4 h-4" /> Commenting on: "{selection?.text.slice(0, 30)}..."</>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-indigo-500/20"
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
            placeholder="Share your thoughts or feedback..."
            className="min-h-[120px] bg-secondary/30 border-border/50 rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500/50 resize-none text-base"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
              <Input
                placeholder="Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 bg-secondary/30 border-border/50 rounded-xl"
              />
            </div>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
              <Input
                placeholder="Email for Gravatar (Optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary/30 border-border/50 rounded-xl"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Public Posting</span>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="btn-gradient rounded-xl px-8 shadow-lg shadow-indigo-500/20 font-bold h-11"
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
              <Send className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
      <div className="space-y-8">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map(i => <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-2xl" />)}
          </div>
        ) : rootComments.length === 0 ? (
          <div className="text-center py-20 bg-secondary/20 rounded-[2rem] border-2 border-dashed border-border/40">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No discussions yet. Be the first to speak up!</p>
          </div>
        ) : (
          rootComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              onReply={(id) => {
                setReplyTo(id);
                onClearSelection?.();
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}