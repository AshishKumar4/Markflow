import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
interface MarkdownPreviewProps {
  content: string;
  className?: string;
  proseSize?: 'sm' | 'base' | 'lg' | 'xl';
}
export function MarkdownPreview({ 
  content, 
  className, 
  proseSize = 'base' 
}: MarkdownPreviewProps) {
  return (
    <div 
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none transition-all duration-200",
        proseSize === 'sm' && "prose-sm",
        proseSize === 'base' && "prose-base",
        proseSize === 'lg' && "prose-lg",
        proseSize === 'xl' && "prose-xl",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || "_No content yet..._"}
      </ReactMarkdown>
    </div>
  );
}