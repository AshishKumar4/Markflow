import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, Trash2, User as UserIcon, CornerDownRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { getGravatarUrl, isCommentOwned } from '@/lib/utils';
import type { Comment } from '@shared/types';
import { cn } from '@/lib/utils';
interface CommentItemProps {
  comment: Comment;
  replies?: Comment[];
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
}
export function CommentItem({ comment, replies = [], onReply, onDelete, depth = 0 }: CommentItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const gravatar = comment.authorEmail ? getGravatarUrl(comment.authorEmail) : null;
  const isOwner = isCommentOwned(comment.id);
  return (
    <div className={cn("space-y-4", depth > 0 ? "ml-6 sm:ml-12 border-l border-border/40 pl-4 sm:pl-6" : "")}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Card className="p-4 sm:p-5 border-border/50 bg-card/40 backdrop-blur-sm hover:border-indigo-500/30 transition-all duration-300">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 shrink-0 border border-border shadow-sm">
              {gravatar ? <AvatarImage src={gravatar} /> : null}
              <AvatarFallback className="bg-secondary text-muted-foreground">
                <UserIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">
                    {comment.authorName || 'Anonymous'}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    {formatDistanceToNow(comment.createdAt)} ago
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/5"
                    onClick={() => onReply(comment.id)}
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                  {isOwner && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {comment.position?.text && (
                <div className="flex items-start gap-2 bg-indigo-500/5 border-l-2 border-indigo-500 px-3 py-2 rounded-r-md text-xs italic text-indigo-700 dark:text-indigo-400">
                  <Quote className="h-3 w-3 mt-0.5 shrink-0 opacity-50" />
                  <span className="line-clamp-2">{comment.position.text}</span>
                </div>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
      <AnimatePresence>
        {replies.length > 0 && (
          <div className="space-y-4">
            {replies.map((reply) => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                onReply={onReply} 
                onDelete={onDelete} 
                depth={depth + 1} 
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}