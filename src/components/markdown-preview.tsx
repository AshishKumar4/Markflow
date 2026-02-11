import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import type { Comment } from '@shared/types';
interface MarkdownPreviewProps {
  content: string;
  className?: string;
  proseSize?: 'sm' | 'base' | 'lg' | 'xl';
  comments?: Comment[];
  onCommentClick?: (commentId: string) => void;
}
/**
 * Robustly extracts text content from React children.
 * Handles strings, arrays, and nested elements (like spans from formatting).
 */
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
  onCommentClick
}: MarkdownPreviewProps) {
  // Helper to find comments associated with a specific text block
  const getCommentsForText = (text: string) => {
    if (!text || text.length < 5) return [];
    return comments.filter(c => c.position?.text && text.includes(c.position.text));
  };
  const BlockWrapper = ({ children }: { children: React.ReactNode }) => {
    // Extract actual text content from the children (which might be an array of React elements)
    const text = getTextContent(children);
    const blockComments = getCommentsForText(text);
    if (blockComments.length === 0) return <>{children}</>;
    return (
      <div className="relative group/block">
        <div
          className="absolute -left-10 lg:-left-12 top-1 hidden md:flex items-center justify-center cursor-pointer opacity-40 group-hover/block:opacity-100 transition-all duration-200 transform hover:scale-110 active:scale-95"
          onClick={() => onCommentClick?.(blockComments[0].id)}
          title={`${blockComments.length} comment(s)`}
        >
          <div className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-background">
            {blockComments.length}
          </div>
        </div>
        {children}
      </div>
    );
  };
  const components = {
    p: ({ children }: any) => <BlockWrapper><p>{children}</p></BlockWrapper>,
    h1: ({ children }: any) => <BlockWrapper><h1>{children}</h1></BlockWrapper>,
    h2: ({ children }: any) => <BlockWrapper><h2>{children}</h2></BlockWrapper>,
    h3: ({ children }: any) => <BlockWrapper><h3>{children}</h3></BlockWrapper>,
    h4: ({ children }: any) => <BlockWrapper><h4>{children}</h4></BlockWrapper>,
    // Support Task Lists
    li: ({ children, className, ...props }: any) => {
      const isTask = className?.includes('task-list-item');
      return (
        <li
          className={cn(className, isTask ? "list-none flex items-start gap-2 -ml-8" : "")}
          {...props}
        >
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
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none transition-all duration-300 ease-in-out",
        "prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground/90",
        "prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-a:font-semibold",
        "prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
        "prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-secondary/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-mono prose-code:text-[0.9em]",
        "prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-2xl prose-pre:shadow-sm",
        "prose-img:rounded-2xl prose-img:shadow-lg",
        "prose-table:border-collapse prose-th:bg-secondary/40 prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-border prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-border",
        "prose-li:marker:text-indigo-500",
        proseSize === 'sm' && "prose-sm",
        proseSize === 'base' && "prose-base",
        proseSize === 'lg' && "prose-lg md:prose-xl",
        proseSize === 'xl' && "prose-xl md:prose-2xl",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content || "_No content yet..._"}
      </ReactMarkdown>
    </div>
  );
}