import { IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, MarkdownDoc, Comment } from "@shared/types";
import { MOCK_CHAT_MESSAGES, MOCK_CHATS, MOCK_USERS } from "@shared/mock-data";
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
   * Note: In a production app, we'd use a secondary index for docId.
   * Here we filter the global list for simplicity in this template.
   */
  static async listForDoc(env: any, docId: string): Promise<Comment[]> {
    const { items } = await this.list(env, null, 1000);
    return items.filter(c => c.docId === docId).sort((a, b) => a.createdAt - b.createdAt);
  }
}
// USER ENTITY: one DO instance per user
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", name: "" };
  static seedData = MOCK_USERS;
}
// CHAT BOARD ENTITY: one DO instance per chat board, stores its own messages
export type ChatBoardState = Chat & { messages: ChatMessage[] };
const SEED_CHAT_BOARDS: ChatBoardState[] = MOCK_CHATS.map(c => ({
  ...c,
  messages: MOCK_CHAT_MESSAGES.filter(m => m.chatId === c.id),
}));
export class ChatBoardEntity extends IndexedEntity<ChatBoardState> {
  static readonly entityName = "chat";
  static readonly indexName = "chats";
  static readonly initialState: ChatBoardState = { id: "", title: "", messages: [] };
  static seedData = SEED_CHAT_BOARDS;
  async listMessages(): Promise<ChatMessage[]> {
    const { messages } = await this.getState();
    return messages;
  }
  async sendMessage(userId: string, text: string): Promise<ChatMessage> {
    const msg: ChatMessage = { id: crypto.randomUUID(), chatId: this.id, userId, text, ts: Date.now() };
    await this.mutate(s => ({ ...s, messages: [...s.messages, msg] }));
    return msg;
  }
}