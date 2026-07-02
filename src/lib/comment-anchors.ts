import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Comment, CommentPosition } from '@shared/types';

type SupportedBlockTag = 'p' | 'blockquote' | 'li' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const CONTEXT_CHARS = 48;

export interface MarkdownBlock {
  key: string;
  tagName: SupportedBlockTag;
  index: number;
  text: string;
  normalizedText: string;
  fingerprint: string;
  sourceStart: number;
  sourceEnd: number;
  globalStart: number;
  globalEnd: number;
}

export interface ResolvedCommentAnchor {
  commentId: string;
  blockKey: string;
  blockIndex: number;
  start: number;
  end: number;
}

export interface ResolvedBlockSegment {
  start: number;
  end: number;
  commentIds: string[];
}

export interface CommentAnchorResolution {
  anchoredIds: Set<string>;
  commentsById: Map<string, ResolvedCommentAnchor>;
  segmentsByBlockKey: Map<string, ResolvedBlockSegment[]>;
}

export function normalizeCommentText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function getCommentQuoteText(position?: CommentPosition | null): string {
  return position?.quote?.exact ?? position?.text ?? '';
}

export function getMarkdownBlockKey(node: any, tagName: SupportedBlockTag, fallbackIndex = 0): string {
  const start = node?.position?.start?.offset;
  const end = node?.position?.end?.offset;
  if (typeof start === 'number' && typeof end === 'number') {
    return `${tagName}:${start}-${end}`;
  }
  return `${tagName}:fallback-${fallbackIndex}`;
}

export function buildMarkdownBlocks(content: string): MarkdownBlock[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content);
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  let globalCursor = 0;

  visit(tree, (node: any) => {
    const tagName = getTagNameForNode(node);
    const start = node?.position?.start?.offset;
    const end = node?.position?.end?.offset;
    if (!tagName || typeof start !== 'number' || typeof end !== 'number') return;

    const text = toString(node, { includeImageAlt: false });
    if (!text.trim()) return;

    const normalizedText = normalizeCommentText(text);
    const block: MarkdownBlock = {
      key: getMarkdownBlockKey(node, tagName, index),
      tagName,
      index,
      text,
      normalizedText,
      fingerprint: hashText(normalizedText),
      sourceStart: start,
      sourceEnd: end,
      globalStart: globalCursor,
      globalEnd: globalCursor + text.length,
    };

    blocks.push(block);
    index += 1;
    globalCursor = block.globalEnd + 2;
  });

  return blocks;
}

export function createCommentPositionFromSelection(
  range: Range,
  blockElement: HTMLElement,
  blocksByKey: Map<string, MarkdownBlock>,
): CommentPosition | null {
  const rawText = range.toString();
  if (!rawText.trim()) return null;

  const offsets = getRangeOffsetsWithinElement(range, blockElement);
  if (!offsets || offsets.end <= offsets.start) return null;

  const blockKey = blockElement.dataset.mfBlockKey;
  const blockIndex = Number(blockElement.dataset.mfBlockIndex ?? NaN);
  const block = blockKey ? blocksByKey.get(blockKey) : undefined;
  const blockText = blockElement.textContent ?? block?.text ?? '';
  if (!blockText) return null;

  const start = clamp(offsets.start, 0, blockText.length);
  const end = clamp(offsets.end, start, blockText.length);
  const exact = blockText.slice(start, end) || rawText;

  return {
    text: exact,
    index: start,
    quote: {
      exact,
      prefix: blockText.slice(Math.max(0, start - CONTEXT_CHARS), start),
      suffix: blockText.slice(end, Math.min(blockText.length, end + CONTEXT_CHARS)),
    },
    block: {
      key: blockKey,
      index: Number.isFinite(blockIndex) ? blockIndex : block?.index,
      start,
      end,
      fingerprint: block?.fingerprint ?? hashText(normalizeCommentText(blockText)),
    },
    document: block
      ? {
          start: block.globalStart + start,
          end: block.globalStart + end,
        }
      : undefined,
  };
}

export function resolveCommentAnchors(comments: Comment[], blocks: MarkdownBlock[]): CommentAnchorResolution {
  const commentsById = new Map<string, ResolvedCommentAnchor>();
  const anchoredIds = new Set<string>();
  const rawRangesByBlockKey = new Map<string, Array<{ start: number; end: number; commentId: string }>>();

  for (const comment of comments) {
    const exact = getCommentQuoteText(comment.position);
    if (!exact.trim()) continue;

    const resolved = resolveCommentAnchor(comment, blocks, exact);
    if (!resolved) continue;

    commentsById.set(comment.id, resolved);
    anchoredIds.add(comment.id);
    const current = rawRangesByBlockKey.get(resolved.blockKey) ?? [];
    current.push({ start: resolved.start, end: resolved.end, commentId: comment.id });
    rawRangesByBlockKey.set(resolved.blockKey, current);
  }

  const segmentsByBlockKey = new Map<string, ResolvedBlockSegment[]>();
  for (const [blockKey, ranges] of rawRangesByBlockKey) {
    segmentsByBlockKey.set(blockKey, buildSegments(ranges));
  }

  return { anchoredIds, commentsById, segmentsByBlockKey };
}

function resolveCommentAnchor(
  comment: Comment,
  blocks: MarkdownBlock[],
  exactText: string,
): ResolvedCommentAnchor | null {
  const normalizedExact = normalizeCommentText(exactText);
  if (!normalizedExact) return null;

  let best: (ResolvedCommentAnchor & { score: number }) | null = null;
  const position = comment.position;
  const targetStart = position?.block?.start ?? position?.index;
  const targetDocStart = position?.document?.start;
  const prefix = normalizeCommentText(position?.quote?.prefix ?? '');
  const suffix = normalizeCommentText(position?.quote?.suffix ?? '');

  for (const block of blocks) {
    const occurrences = findNormalizedOccurrences(block.text, exactText);
    if (occurrences.length === 0) continue;

    for (const occurrence of occurrences) {
      let score = 0;

      if (position?.block?.key && position.block.key === block.key) score += 500;
      if (position?.block?.fingerprint && position.block.fingerprint === block.fingerprint) score += 200;

      if (typeof position?.block?.index === 'number') {
        score += Math.max(0, 90 - Math.abs(block.index - position.block.index) * 12);
      }

      if (typeof targetStart === 'number') {
        score += Math.max(0, 70 - Math.abs(occurrence.start - targetStart));
      }

      if (typeof targetDocStart === 'number') {
        score += Math.max(0, 30 - Math.abs((block.globalStart + occurrence.start) - targetDocStart) / 2);
      }

      if (prefix) {
        const before = normalizeCommentText(block.text.slice(0, occurrence.start));
        score += sharedSuffixLength(before, prefix) * 4;
      }

      if (suffix) {
        const after = normalizeCommentText(block.text.slice(occurrence.end));
        score += sharedPrefixLength(after, suffix) * 4;
      }

      if (block.text.slice(occurrence.start, occurrence.end) === exactText) {
        score += 12;
      }

      if (!best || score > best.score) {
        best = {
          commentId: comment.id,
          blockKey: block.key,
          blockIndex: block.index,
          start: occurrence.start,
          end: occurrence.end,
          score,
        };
      }
    }
  }

  if (!best) return null;

  return {
    commentId: best.commentId,
    blockKey: best.blockKey,
    blockIndex: best.blockIndex,
    start: best.start,
    end: best.end,
  };
}

function findNormalizedOccurrences(text: string, needle: string): Array<{ start: number; end: number }> {
  const normalizedNeedle = normalizeCommentText(needle);
  if (!normalizedNeedle) return [];

  const indexedText = buildNormalizedIndex(text);
  if (!indexedText.normalized) return [];

  const occurrences: Array<{ start: number; end: number }> = [];
  let fromIndex = 0;

  while (fromIndex < indexedText.normalized.length) {
    const foundAt = indexedText.normalized.indexOf(normalizedNeedle, fromIndex);
    if (foundAt === -1) break;

    const start = indexedText.mapToOriginal[foundAt];
    const endIndex = foundAt + normalizedNeedle.length - 1;
    const end = indexedText.mapToOriginal[endIndex] + 1;
    occurrences.push({ start, end });
    fromIndex = foundAt + 1;
  }

  return occurrences;
}

function buildSegments(ranges: Array<{ start: number; end: number; commentId: string }>): ResolvedBlockSegment[] {
  const boundaries = Array.from(new Set(ranges.flatMap((range) => [range.start, range.end]))).sort((a, b) => a - b);
  const segments: ResolvedBlockSegment[] = [];

  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    if (end <= start) continue;

    const commentIds = ranges
      .filter((range) => range.start < end && range.end > start)
      .map((range) => range.commentId);

    if (commentIds.length === 0) continue;

    const previous = segments[segments.length - 1];
    if (previous && previous.end === start && sameCommentIds(previous.commentIds, commentIds)) {
      previous.end = end;
      continue;
    }

    segments.push({ start, end, commentIds });
  }

  return segments;
}

function sameCommentIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function buildNormalizedIndex(text: string): { normalized: string; mapToOriginal: number[] } {
  const chars: string[] = [];
  const mapToOriginal: number[] = [];
  let previousWasSpace = true;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (/\s/.test(char)) {
      if (!previousWasSpace && chars.length > 0) {
        chars.push(' ');
        mapToOriginal.push(i);
      }
      previousWasSpace = true;
      continue;
    }

    chars.push(char.toLowerCase());
    mapToOriginal.push(i);
    previousWasSpace = false;
  }

  while (chars.length > 0 && chars[chars.length - 1] === ' ') {
    chars.pop();
    mapToOriginal.pop();
  }

  return {
    normalized: chars.join(''),
    mapToOriginal,
  };
}

function getRangeOffsetsWithinElement(range: Range, element: HTMLElement): { start: number; end: number } | null {
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
    return null;
  }

  const startRange = document.createRange();
  startRange.selectNodeContents(element);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = document.createRange();
  endRange.selectNodeContents(element);
  endRange.setEnd(range.endContainer, range.endOffset);

  return {
    start: startRange.toString().length,
    end: endRange.toString().length,
  };
}

function sharedPrefixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let length = 0;
  while (length < limit && left[length] === right[length]) length += 1;
  return length;
}

function sharedSuffixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let length = 0;
  while (length < limit && left[left.length - 1 - length] === right[right.length - 1 - length]) {
    length += 1;
  }
  return length;
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTagNameForNode(node: any): SupportedBlockTag | null {
  switch (node?.type) {
    case 'paragraph':
      return 'p';
    case 'blockquote':
      return 'blockquote';
    case 'listItem':
      return 'li';
    case 'heading': {
      const depth = typeof node.depth === 'number' ? node.depth : 1;
      const clampedDepth = Math.max(1, Math.min(6, depth));
      return `h${clampedDepth}` as SupportedBlockTag;
    }
    default:
      return null;
  }
}
