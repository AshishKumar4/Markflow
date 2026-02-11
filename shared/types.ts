export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface MarkdownDoc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
export interface Comment {
  id: string;
  docId: string;
  parentId?: string;
  authorName?: string;
  authorEmail?: string;
  content: string;
  position?: {
    text?: string;
    index?: number;
  };
  createdAt: number;
  updatedAt: number;
}
// Minimal real-world chat example types (shared by frontend and worker)
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number; // epoch millis
}