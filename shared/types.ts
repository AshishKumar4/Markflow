/** Standard API response wrapper used by all endpoints. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** A markdown document with title and content. */
export interface MarkdownDoc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

/** A comment on a document, optionally anchored to highlighted text. */
export interface CommentQuoteAnchor {
  exact?: string;
  prefix?: string;
  suffix?: string;
}

export interface CommentBlockAnchor {
  key?: string;
  index?: number;
  start?: number;
  end?: number;
  fingerprint?: string;
}

export interface CommentDocumentAnchor {
  start?: number;
  end?: number;
}

export interface CommentPosition {
  text?: string;
  index?: number;
  quote?: CommentQuoteAnchor;
  block?: CommentBlockAnchor;
  document?: CommentDocumentAnchor;
}

export interface Comment {
  id: string;
  docId: string;
  parentId?: string;
  authorName?: string;
  authorEmail?: string;
  content: string;
  position?: CommentPosition;
  createdAt: number;
  updatedAt: number;
}

/** Image metadata returned by the image upload/list APIs. */
export interface ImageMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: number;
}
