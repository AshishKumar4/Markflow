import React, { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Reply, Trash2, User as UserIcon, Quote, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { getGravatarUrl, isCommentOwned, cn, formatQuote } from '@/lib/utils';
import type { Comment } from '@shared/types';
interface CommentItemProps {
  comment: Comment;
  replies?: Comment[];
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
  isHighlighted?: boolean;
}
export function CommentItem({
  comment,
  replies = [],
  onReply,
  onDelete,
  depth = 0,
  isHighlighted = false
}: CommentItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const gravatar = comment.authorEmail ? getGravatarUrl(comment.authorEmail) : null;
  const isOwner = isCommentOwned(comment.id);
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
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
        <Card ref={itemRef} className={cn(
          "p-3 border-border/50 bg-card/40 backdrop-blur-sm transition-all duration-500",
          isHighlighted ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10 border-indigo-500 bg-indigo-50/5" : "hover:border-indigo-500/30"
        )}>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-indigo-600"
                    onClick={() => onReply(comment.id)}
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </Button>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {comment.position?.text && (
                <div className="flex items-start gap-1.5 bg-indigo-500/5 border-l-2 border-indigo-500 px-2 py-1 rounded-r-md text-[11px] italic text-indigo-700 dark:text-indigo-400">
                  <Quote className="h-2.5 w-2.5 mt-0.5 shrink-0 opacity-50" />
                  <span className="line-clamp-1">{formatQuote(comment.position.text, 40)}</span>
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
              depth={depth + 1}
              isHighlighted={isHighlighted}
            />
          ))}
        </div>
      )}
    </div>
  );
}