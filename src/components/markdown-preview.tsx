import React, { useMemo, useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Comment } from '@shared/types';
import { motion } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { MermaidDiagram } from './mermaid-diagram';
import { ImageLightbox } from './image-lightbox';

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
  // Lightbox state
  const [lightbox, setLightbox] = useState<{
    open: boolean;
    src?: string;
    svgContent?: string;
    alt?: string;
  }>({ open: false });

  const openImageLightbox = useCallback((src: string, alt?: string) => {
    setLightbox({ open: true, src, alt });
  }, []);

  const openSvgLightbox = useCallback((svgContent: string) => {
    setLightbox({ open: true, svgContent, alt: 'Diagram' });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox({ open: false });
  }, []);

  const getCommentsForText = useCallback((text: string) => {
    if (!text || text.length < 3) return [];
    return comments.filter(c => {
      if (!c.position?.text) return false;
      const cleanTarget = c.position.text.toLowerCase().trim();
      const cleanBlock = text.toLowerCase();
      return cleanBlock.includes(cleanTarget);
    });
  }, [comments]);

  const components = useMemo(() => {
    const BlockWrapper = ({ children }: { children: React.ReactNode }) => {
      const text = getTextContent(children);
      const blockComments = getCommentsForText(text);
      const hasActive = blockComments.some(c => c.id === activeCommentId);
      if (blockComments.length === 0) return <>{children}</>;
      return (
        <div className="relative group/block min-h-[1.5em]">
          <div
            className="absolute -left-10 lg:-left-12 top-1 hidden md:flex items-center justify-center cursor-pointer transition-all duration-300 transform z-20"
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
            "transition-all duration-200 rounded-xl -mx-3 px-3 py-1",
            hasActive
              ? "bg-indigo-500/[0.04] ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]"
              : "hover:bg-slate-500/[0.02]"
          )}>
            {children}
          </div>
        </div>
      );
    };
    return {
      p: ({ children }: any) => <BlockWrapper><p>{children}</p></BlockWrapper>,
      h1: ({ children }: any) => <BlockWrapper><h1>{children}</h1></BlockWrapper>,
      h2: ({ children }: any) => <BlockWrapper><h2>{children}</h2></BlockWrapper>,
      h3: ({ children }: any) => <BlockWrapper><h3>{children}</h3></BlockWrapper>,
      h4: ({ children }: any) => <BlockWrapper><h4>{children}</h4></BlockWrapper>,
      li: ({ children, className: liClassName, ...props }: any) => {
        const isTask = liClassName?.includes('task-list-item');
        return (
          <li className={cn(liClassName, isTask ? "list-none flex items-start gap-2 -ml-8" : "")} {...props}>
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
      },
      // Custom img: clickable with expand affordance
      img: ({ src, alt, ...props }: any) => (
        <span
          className="group/img relative block cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label={`View ${alt || 'image'} fullscreen`}
          onClick={() => src && openImageLightbox(src, alt)}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && src) { e.preventDefault(); openImageLightbox(src, alt); } }}
        >
          <img src={src} alt={alt || ''} loading="lazy" {...props} />
          <span className="absolute top-3 right-3 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm text-white rounded-lg p-1.5 pointer-events-none">
            <Maximize2 className="w-4 h-4" />
          </span>
        </span>
      ),
      pre: ({ node, children, ...props }: any) => {
        // Detect mermaid code blocks by inspecting the hast AST node
        const codeChild = node?.children?.[0];
        if (codeChild?.tagName === 'code') {
          const langClass = codeChild.properties?.className?.[0] || '';
          if (langClass === 'language-mermaid') {
            const text = codeChild.children?.[0]?.value || '';
            return <MermaidDiagram chart={text} onExpand={openSvgLightbox} />;
          }
        }
        return <pre {...props}>{children}</pre>;
      }
    };
  }, [getCommentsForText, activeCommentId, onCommentClick, openImageLightbox, openSvgLightbox]);

  return (
    <>
      <div className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        "prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight",
        "prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline font-medium",
        "prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:px-6 prose-blockquote:py-1 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic",
        "prose-pre:bg-slate-900 prose-pre:rounded-2xl prose-pre:shadow-xl prose-pre:border prose-pre:border-white/5",
        "prose-img:rounded-2xl prose-img:shadow-lg",
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
      <ImageLightbox
        open={lightbox.open}
        src={lightbox.src}
        svgContent={lightbox.svgContent}
        alt={lightbox.alt}
        onClose={closeLightbox}
      />
    </>
  );
}
