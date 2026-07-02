import React, { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Reply, Trash2, User as UserIcon, Quote, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { getGravatarUrl, isCommentOwned, cn, formatQuote } from '@/lib/utils';
import { getCommentQuoteText } from '@/lib/comment-anchors';
import type { Comment } from '@shared/types';
interface CommentItemProps {
  comment: Comment;
  replies?: Comment[];
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  onJumpTo?: (commentId: string) => void;
  isOrphan?: boolean;
  depth?: number;
  isHighlighted?: boolean;
  anchoredIds?: Set<string>;
}
export function CommentItem({
  comment,
  replies = [],
  onReply,
  onDelete,
  onJumpTo,
  isOrphan = false,
  depth = 0,
  isHighlighted = false,
  anchoredIds
}: CommentItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const gravatar = comment.authorEmail ? getGravatarUrl(comment.authorEmail) : null;
  const isOwner = isCommentOwned(comment.id);
  const quoteText = getCommentQuoteText(comment.position);
  const hasPosition = !!quoteText;
  const isJumpable = hasPosition && !!onJumpTo;

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const handleCardClick = () => {
    if (!isJumpable) return;
    onJumpTo!(comment.id);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (!isJumpable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onJumpTo!(comment.id);
    }
  };

  return (
    <div className={cn("space-y-3", depth > 0 ? "ml-4 border-l border-border/40 pl-3" : "")}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{
          opacity: 1,
          x: 0,
          scale: isHighlighted ? 1.01 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <Card
          ref={itemRef}
          role={isJumpable ? 'button' : undefined}
          tabIndex={isJumpable ? 0 : undefined}
          aria-label={isJumpable ? 'Jump to annotation in document' : undefined}
          onClick={isJumpable ? handleCardClick : undefined}
          onKeyDown={isJumpable ? handleCardKeyDown : undefined}
          title={isJumpable ? (isOrphan ? 'Original text no longer found' : 'Jump to annotation in document') : undefined}
          className={cn(
            "group/card p-3 border-border/50 bg-card/40 backdrop-blur-sm transition-all duration-500",
            isJumpable && "cursor-pointer hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/5 hover:-translate-y-0.5",
            isJumpable && "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1",
            isHighlighted ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10 border-indigo-500 bg-indigo-50/5" : !isJumpable && "hover:border-indigo-500/30",
            isOrphan && "opacity-80"
          )}
        >
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0 border border-border shadow-sm">
              {gravatar ? <AvatarImage src={gravatar} /> : null}
              <AvatarFallback className="bg-secondary text-muted-foreground">
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-foreground truncate max-w-[120px]">
                    {comment.authorName || 'Anonymous'}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                    {formatDistanceToNow(comment.createdAt)} ago
                  </span>
                </div>
                <div className="flex items-center">
                  {isJumpable && !isOrphan && (
                    <span
                      aria-hidden
                      className="hidden group-hover/card:inline-flex items-center text-[9px] font-bold uppercase tracking-widest text-indigo-600 mr-1"
                    >
                      <Target className="w-3 h-3 mr-1" /> Jump
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-indigo-600"
                    onClick={(e) => { e.stopPropagation(); onReply(comment.id); }}
                    title="Reply"
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </Button>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {hasPosition && (
                <div
                  className={cn(
                    "group/quote flex items-start gap-1.5 border-l-2 px-2 py-1 rounded-r-md text-[11px] italic transition-colors",
                    isOrphan
                      ? "bg-amber-500/5 border-amber-500 text-amber-700 dark:text-amber-400"
                      : "bg-indigo-500/5 border-indigo-500 text-indigo-700 dark:text-indigo-400",
                    isJumpable && !isOrphan && "hover:bg-indigo-500/10"
                  )}
                >
                  {isOrphan ? (
                    <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0 opacity-70" />
                  ) : (
                    <Quote className="h-2.5 w-2.5 mt-0.5 shrink-0 opacity-50" />
                  )}
                  <span className="line-clamp-1 flex-1">{formatQuote(quoteText, 40)}</span>
                  {isJumpable && !isOrphan && (
                    <Target className="h-2.5 w-2.5 mt-0.5 shrink-0 opacity-0 group-hover/quote:opacity-70 transition-opacity" />
                  )}
                  {isOrphan && (
                    <span className="text-[9px] font-bold uppercase tracking-tight opacity-70 shrink-0">Not found</span>
                  )}
                </div>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
      {replies.length > 0 && (
        <div className="space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              onJumpTo={onJumpTo}
              anchoredIds={anchoredIds}
              isOrphan={!!getCommentQuoteText(reply.position) && !!anchoredIds && !anchoredIds.has(reply.id)}
              depth={depth + 1}
              isHighlighted={isHighlighted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
