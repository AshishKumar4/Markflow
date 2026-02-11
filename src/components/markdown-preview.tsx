import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Comment } from '@shared/types';
import { motion } from 'framer-motion';
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
  if (React.isValidElement(children)) return getTextContent(children.props.children);
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
    if (!text || text.length < 5) return [];
    return comments.filter(c => c.position?.text && text.includes(c.position.text));
  };
  const BlockWrapper = ({ children }: { children: React.ReactNode }) => {
    const text = getTextContent(children);
    const blockComments = getCommentsForText(text);
    const hasActive = blockComments.some(c => c.id === activeCommentId);
    if (blockComments.length === 0) return <>{children}</>;
    return (
      <div className="relative group/block">
        <div
          className="absolute -left-8 lg:-left-10 top-1 hidden md:flex items-center justify-center cursor-pointer group-hover/block:opacity-100 transition-all duration-200 transform hover:scale-110 active:scale-95 z-20"
          onClick={() => onCommentClick?.(blockComments[0].id)}
          title={`${blockComments.length} comment(s)`}
        >
          <motion.div 
            animate={hasActive ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={cn(
              "rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold shadow-sm ring-2 ring-background transition-colors",
              hasActive 
                ? "bg-indigo-600 text-white ring-indigo-500/50" 
                : "bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover/block:bg-indigo-500 group-hover/block:text-white"
            )}
          >
            {blockComments.length}
          </motion.div>
        </div>
        <div className={cn(
          "transition-colors duration-500 rounded-lg -mx-2 px-2",
          hasActive ? "bg-indigo-500/5 ring-1 ring-indigo-500/20" : ""
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
      "prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline",
      "prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:px-6 prose-blockquote:rounded-r-xl",
      "prose-pre:bg-slate-900 prose-pre:rounded-2xl",
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