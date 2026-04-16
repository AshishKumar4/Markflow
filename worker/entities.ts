import { IndexedEntity } from "./core-utils";
import type { MarkdownDoc, Comment } from "@shared/types";

/**
 * MarkFlow Document Entity
 */
export class DocEntity extends IndexedEntity<MarkdownDoc> {
  static readonly entityName = "doc";
  static readonly indexName = "docs";
  static readonly initialState: MarkdownDoc = {
    id: "",
    title: "Untitled",
    content: "",
    createdAt: 0,
    updatedAt: 0,
  };
}

/**
 * MarkFlow Comment Entity
 */
export class CommentEntity extends IndexedEntity<Comment> {
  static readonly entityName = "comment";
  static readonly indexName = "comments";
  static readonly initialState: Comment = {
    id: "",
    docId: "",
    content: "",
    createdAt: 0,
    updatedAt: 0,
  };

  /**
   * List all comments for a document.
   * Filters the global comment list by docId, sorted by creation time.
   */
  static async listForDoc(env: any, docId: string): Promise<Comment[]> {
    const { items } = await this.list(env, null, 1000);
    return items.filter(c => c.docId === docId).sort((a, b) => a.createdAt - b.createdAt);
  }
}
