import React, { useMemo, useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Comment } from '@shared/types';
import { motion } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import {
  buildMarkdownBlocks,
  getMarkdownBlockKey,
  resolveCommentAnchors,
  type CommentAnchorResolution,
  type MarkdownBlock,
  type ResolvedBlockSegment,
} from '@/lib/comment-anchors';
import { MermaidDiagram } from './mermaid-diagram';
import { ImageLightbox } from './image-lightbox';

interface MarkdownPreviewProps {
  content: string;
  blocks?: MarkdownBlock[];
  className?: string;
  proseSize?: 'sm' | 'base' | 'lg' | 'xl';
  comments?: Comment[];
  anchorResolution?: CommentAnchorResolution;
  onCommentClick?: (commentId: string) => void;
  activeCommentId?: string | null;
}

type SupportedBlockTag = 'p' | 'blockquote' | 'li' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type CursorRef = { current: number };

const EMPTY_ANCHOR_RESOLUTION: CommentAnchorResolution = {
  anchoredIds: new Set(),
  commentsById: new Map(),
  segmentsByBlockKey: new Map(),
};

export function MarkdownPreview({
  content,
  blocks,
  className,
  proseSize = 'base',
  comments = [],
  anchorResolution,
  onCommentClick,
  activeCommentId,
}: MarkdownPreviewProps) {
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

  const markdownBlocks = useMemo(() => {
    if (blocks) return blocks;
    if (!anchorResolution && comments.length === 0) return [];
    return buildMarkdownBlocks(content);
  }, [anchorResolution, blocks, comments.length, content]);
  const blocksByKey = useMemo(
    () => new Map(markdownBlocks.map((block) => [block.key, block])),
    [markdownBlocks],
  );
  const resolvedAnchors = useMemo(
    () => anchorResolution ?? (comments.length > 0 ? resolveCommentAnchors(comments, markdownBlocks) : EMPTY_ANCHOR_RESOLUTION),
    [anchorResolution, comments, markdownBlocks],
  );

  const renderWrappedBlock = useCallback(({
    children,
    node,
    tagName,
    tagProps,
  }: {
    children: React.ReactNode;
    node: any;
    tagName: SupportedBlockTag;
    tagProps?: Record<string, unknown>;
  }) => {
    const blockKey = getMarkdownBlockKey(node, tagName);
    const block = blocksByKey.get(blockKey);
    const blockIndex = block?.index ?? -1;
    const segments = resolvedAnchors.segmentsByBlockKey.get(blockKey) ?? [];
    const commentIds = Array.from(new Set(segments.flatMap((segment) => segment.commentIds)));
    const hasActive = !!activeCommentId && commentIds.includes(activeCommentId);

    const Tag = tagName as any;
    const wrappedChildren = segments.length > 0
      ? wrapSegmentsInChildren(children, segments, { current: 0 }, activeCommentId, onCommentClick, `${blockKey}-s`)
      : children;

    const baseTagProps = {
      ...tagProps,
      id: blockIndex >= 0 ? `mf-block-${blockIndex}` : undefined,
      'data-mf-block-key': blockKey,
      'data-mf-block-index': blockIndex,
    };

    const tagElement = (
      <Tag
        {...baseTagProps}
      >
        {wrappedChildren}
      </Tag>
    );

    if (segments.length === 0) return tagElement;

    const commentIndicator = (
      <div
        className="absolute -left-10 lg:-left-12 top-1 hidden md:flex items-center justify-center cursor-pointer transition-all duration-300 transform z-20"
        onClick={() => onCommentClick?.(commentIds[0])}
        role="button"
        tabIndex={0}
        aria-label={`${commentIds.length} comment${commentIds.length === 1 ? '' : 's'} on this block`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCommentClick?.(commentIds[0]);
          }
        }}
      >
        <motion.div
          animate={hasActive ? { scale: [1, 1.15, 1], boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)' } : { scale: 1 }}
          transition={{ repeat: hasActive ? Infinity : 0, duration: 2 }}
          className={cn(
            'rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-black shadow-sm ring-2 transition-all',
            hasActive
              ? 'bg-indigo-600 text-white ring-indigo-500/50'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 ring-transparent group-hover/block:bg-indigo-500 group-hover/block:text-white group-hover/block:scale-110 opacity-60 group-hover/block:opacity-100',
          )}
        >
          {commentIds.length}
        </motion.div>
      </div>
    );

    if (tagName === 'li') {
      return (
        <li
          {...baseTagProps}
          className={cn(
            tagProps?.className as string | undefined,
            'relative group/block min-h-[1.5em] transition-all duration-200 rounded-xl -mx-3 px-3 py-1',
            hasActive
              ? 'bg-indigo-500/[0.04] ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]'
              : 'hover:bg-slate-500/[0.02]',
          )}
        >
          {commentIndicator}
          {wrappedChildren}
        </li>
      );
    }

    return (
      <div className="relative group/block min-h-[1.5em]" data-block-index={blockIndex}>
        {commentIndicator}
        <div
          className={cn(
            'transition-all duration-200 rounded-xl -mx-3 px-3 py-1',
            hasActive
              ? 'bg-indigo-500/[0.04] ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]'
              : 'hover:bg-slate-500/[0.02]',
          )}
        >
          {tagElement}
        </div>
      </div>
    );
  }, [activeCommentId, resolvedAnchors.segmentsByBlockKey, blocksByKey, onCommentClick]);

  const components = useMemo(() => ({
    p: ({ children, node, ...props }: any) => renderWrappedBlock({ children, node, tagName: 'p', tagProps: props }),
    blockquote: ({ children, node, ...props }: any) => renderWrappedBlock({ children, node, tagName: 'blockquote', tagProps: props }),
    h1: ({ children, node, ...props }: any) => renderWrappedBlock({ children, node, tagName: 'h1', tagProps: props }),
    h2: ({ children, node, ...props }: any) => renderWrappedBlock({ children, node, tagName: 'h2', tagProps: props }),
    h3: ({ children, node, ...props }: any) => renderWrappedBlock({ children, node, tagName: 'h3', tagProps: props }),
    h4: ({ children, node, ...props }: any) => renderWrappedBlock({ children, node, tagName: 'h4', tagProps: props }),
    h5: ({ children, node, ...props }: any) => renderWrappedBlock({ children, node, tagName: 'h5', tagProps: props }),
    h6: ({ children, node, ...props }: any) => renderWrappedBlock({ children, node, tagName: 'h6', tagProps: props }),
    li: ({ children, node, className: liClassName, ...props }: any) => {
      const isTask = liClassName?.includes('task-list-item');
      return renderWrappedBlock({
        children,
        node,
        tagName: 'li',
        tagProps: {
          ...props,
          className: cn(liClassName, isTask ? 'list-none flex items-start gap-2 -ml-8' : ''),
        },
      });
    },
    input: ({ checked, ...props }: any) => {
      if (props.type === 'checkbox') {
        return (
          <span className="inline-flex mt-1.5 shrink-0">
            <div
              className={cn(
                'w-4 h-4 rounded-md border flex items-center justify-center transition-colors',
                checked ? 'bg-indigo-600 border-indigo-600' : 'border-muted-foreground/30 bg-background',
              )}
            >
              {checked && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </span>
        );
      }
      return <input {...props} />;
    },
    img: ({ src, alt, ...props }: any) => (
      <span
        className="group/img relative block cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`View ${alt || 'image'} fullscreen`}
        onClick={() => src && openImageLightbox(src, alt)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && src) {
            e.preventDefault();
            openImageLightbox(src, alt);
          }
        }}
      >
        <img src={src} alt={alt || ''} loading="lazy" {...props} />
        <span className="absolute top-3 right-3 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm text-white rounded-lg p-1.5 pointer-events-none">
          <Maximize2 className="w-4 h-4" />
        </span>
      </span>
    ),
    pre: ({ node, children, ...props }: any) => {
      const codeChild = node?.children?.[0];
      if (codeChild?.tagName === 'code') {
        const langClass = codeChild.properties?.className?.[0] || '';
        if (langClass === 'language-mermaid') {
          const text = codeChild.children?.[0]?.value || '';
          return <MermaidDiagram chart={text} onExpand={openSvgLightbox} />;
        }
      }
      return <pre {...props}>{children}</pre>;
    },
  }), [openImageLightbox, openSvgLightbox, renderWrappedBlock]);

  return (
    <>
      <div className={cn(
        'prose prose-slate dark:prose-invert max-w-none',
        'prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight',
        'prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline font-medium',
        'prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:px-6 prose-blockquote:py-1 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic',
        'prose-pre:bg-slate-900 prose-pre:rounded-2xl prose-pre:shadow-xl prose-pre:border prose-pre:border-white/5',
        'prose-img:rounded-2xl prose-img:shadow-lg',
        proseSize === 'sm' && 'prose-sm',
        proseSize === 'base' && 'prose-base',
        proseSize === 'lg' && 'prose-lg md:prose-xl',
        proseSize === 'xl' && 'prose-xl md:prose-2xl',
        className,
      )}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeHighlight, { ignoreMissing: true, plainText: ['mermaid'] }]]}
          components={components}
        >
          {content || '_No content yet..._'}
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

function wrapSegmentsInChildren(
  children: React.ReactNode,
  segments: ResolvedBlockSegment[],
  cursor: CursorRef,
  activeCommentId: string | null | undefined,
  onCommentClick?: (commentId: string) => void,
  keyBase = 'segment',
): React.ReactNode {
  if (typeof children === 'string' || typeof children === 'number') {
    return wrapTextNode(String(children), segments, cursor, activeCommentId, onCommentClick, keyBase);
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <React.Fragment key={`${keyBase}-${index}`}>
        {wrapSegmentsInChildren(child, segments, cursor, activeCommentId, onCommentClick, `${keyBase}-${index}`)}
      </React.Fragment>
    ));
  }

  if (React.isValidElement(children)) {
    const nestedChildren = wrapSegmentsInChildren(
      children.props.children,
      segments,
      cursor,
      activeCommentId,
      onCommentClick,
      `${keyBase}-child`,
    );
    return React.cloneElement(children, { ...children.props }, nestedChildren);
  }

  return children;
}

function wrapTextNode(
  text: string,
  segments: ResolvedBlockSegment[],
  cursor: CursorRef,
  activeCommentId: string | null | undefined,
  onCommentClick?: (commentId: string) => void,
  keyBase = 'text',
): React.ReactNode {
  if (!text) return text;

  const textStart = cursor.current;
  const textEnd = textStart + text.length;
  cursor.current = textEnd;

  const overlapping = segments.filter((segment) => segment.end > textStart && segment.start < textEnd);
  if (overlapping.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let localCursor = 0;

  overlapping.forEach((segment, index) => {
    const localStart = Math.max(segment.start, textStart) - textStart;
    const localEnd = Math.min(segment.end, textEnd) - textStart;

    if (localStart > localCursor) {
      parts.push(<React.Fragment key={`${keyBase}-plain-${index}`}>{text.slice(localCursor, localStart)}</React.Fragment>);
    }

    const markedText = text.slice(localStart, localEnd);
    if (markedText) {
      const isActive = !!activeCommentId && segment.commentIds.includes(activeCommentId);
      parts.push(
        <mark
          key={`${keyBase}-mark-${index}`}
          data-comment-ids={segment.commentIds.join(' ')}
          data-mf-mark="1"
          role="button"
          tabIndex={0}
          aria-label={`View comment on: ${markedText}`}
          title={segment.commentIds.length > 1 ? `${segment.commentIds.length} comments` : 'View comment'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCommentClick?.(segment.commentIds[0]);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onCommentClick?.(segment.commentIds[0]);
            }
          }}
          className={cn(
            'mf-comment-mark cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-colors duration-200',
            'border-b-2 border-indigo-400/70 text-inherit',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
            isActive && 'mf-comment-mark-active border-indigo-500 ring-1 ring-indigo-500/60 shadow-[0_0_10px_rgba(99,102,241,0.25)]',
          )}
        >
          {markedText}
        </mark>,
      );
    }

    localCursor = localEnd;
  });

  if (localCursor < text.length) {
    parts.push(<React.Fragment key={`${keyBase}-tail`}>{text.slice(localCursor)}</React.Fragment>);
  }

  return <>{parts}</>;
}
