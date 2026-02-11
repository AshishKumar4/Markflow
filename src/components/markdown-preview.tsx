import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Comment } from '@shared/types';
import { motion, AnimatePresence } from 'framer-motion';
interface MarkdownPreviewProps {
  content: string;
  className?: string;
  proseSize?: 'sm' | 'base' | 'lg' | 'xl';
  comments?: Comment[];
  onCommentClick?: (commentId: string) => void;
  activeCommentId?: string | null;
}
function getTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getTextContent).join('');
  if (React.isValidElement(children)) {
    // Recursively get text from nested elements (bold, italic, links, etc.)
    return getTextContent(children.props.children);
  }
  return '';
}
export function MarkdownPreview({
  content,
  className,
  proseSize = 'base',
  comments = [],
  onCommentClick,
  activeCommentId
}: MarkdownPreviewProps) {
  const getCommentsForText = (text: string) => {
    if (!text || text.length < 3) return [];
    // More robust matching for annotations
    return comments.filter(c => {
      if (!c.position?.text) return false;
      const cleanTarget = c.position.text.toLowerCase().trim();
      const cleanBlock = text.toLowerCase();
      return cleanBlock.includes(cleanTarget);
    });
  };
  const BlockWrapper = ({ children }: { children: React.ReactNode }) => {
    const text = getTextContent(children);
    const blockComments = getCommentsForText(text);
    const hasActive = blockComments.some(c => c.id === activeCommentId);
    if (blockComments.length === 0) return <>{children}</>;
    return (
      <div className="relative group/block">
        <div
          className="absolute -left-8 lg:-left-12 top-1 hidden md:flex items-center justify-center cursor-pointer transition-all duration-300 transform z-20"
          onClick={() => onCommentClick?.(blockComments[0].id)}
        >
          <motion.div
            animate={hasActive ? { scale: [1, 1.15, 1], boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)" } : { scale: 1 }}
            transition={{ repeat: hasActive ? Infinity : 0, duration: 2 }}
            className={cn(
              "rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-black shadow-sm ring-2 transition-all",
              hasActive
                ? "bg-indigo-600 text-white ring-indigo-500/50"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 ring-transparent group-hover/block:bg-indigo-500 group-hover/block:text-white group-hover/block:scale-110 opacity-60 group-hover/block:opacity-100"
            )}
          >
            {blockComments.length}
          </motion.div>
        </div>
        <div className={cn(
          "transition-all duration-700 rounded-xl -mx-3 px-3 py-1",
          hasActive 
            ? "bg-indigo-500/[0.03] ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]" 
            : "hover:bg-slate-500/[0.02]"
        )}>
          {children}
        </div>
      </div>
    );
  };
  const components = {
    p: ({ children }: any) => <BlockWrapper><p>{children}</p></BlockWrapper>,
    h1: ({ children }: any) => <BlockWrapper><h1>{children}</h1></BlockWrapper>,
    h2: ({ children }: any) => <BlockWrapper><h2>{children}</h2></BlockWrapper>,
    h3: ({ children }: any) => <BlockWrapper><h3>{children}</h3></BlockWrapper>,
    h4: ({ children }: any) => <BlockWrapper><h4>{children}</h4></BlockWrapper>,
    li: ({ children, className, ...props }: any) => {
      const isTask = className?.includes('task-list-item');
      return (
        <li className={cn(className, isTask ? "list-none flex items-start gap-2 -ml-8" : "")} {...props}>
          {children}
        </li>
      );
    },
    input: ({ checked, ...props }: any) => {
      if (props.type === 'checkbox') {
        return (
          <span className="inline-flex mt-1.5 shrink-0">
            <div className={cn(
              "w-4 h-4 rounded-md border flex items-center justify-center transition-colors",
              checked ? "bg-indigo-600 border-indigo-600" : "border-muted-foreground/30 bg-background"
            )}>
              {checked && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </span>
        );
      }
      return <input {...props} />;
    }
  };
  return (
    <div className={cn(
      "prose prose-slate dark:prose-invert max-w-none",
      "prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight",
      "prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline font-medium",
      "prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:px-6 prose-blockquote:py-1 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic",
      "prose-pre:bg-slate-900 prose-pre:rounded-2xl prose-pre:shadow-xl prose-pre:border prose-pre:border-white/5",
      "prose-img:rounded-3xl prose-img:shadow-2xl",
      proseSize === 'sm' && "prose-sm",
      proseSize === 'base' && "prose-base",
      proseSize === 'lg' && "prose-lg md:prose-xl",
      proseSize === 'xl' && "prose-xl md:prose-2xl",
      className
    )}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content || "_No content yet..._"}
      </ReactMarkdown>
    </div>
  );
}