import { Hono } from "hono";
import type { Env } from './core-utils';
import { DocEntity, CommentEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { MarkdownDoc, Comment } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // DOCUMENTS (v1)
  app.get('/api/v1/documents/:id', async (c) => {
    const id = c.req.param('id');
    const doc = new DocEntity(c.env, id);
    if (!await doc.exists()) return notFound(c, 'document not found');
    return ok(c, await doc.getState());
  });
  app.post('/api/v1/documents', async (c) => {
    const body = await c.req.json() as Partial<MarkdownDoc>;
    const id = body.id || crypto.randomUUID();
    const now = Date.now();
    const docData: MarkdownDoc = {
      id,
      title: body.title?.trim() || 'Untitled',
      content: body.content || '',
      createdAt: now,
      updatedAt: now,
    };
    await DocEntity.create(c.env, docData);
    return ok(c, docData);
  });
  app.put('/api/v1/documents/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as Partial<MarkdownDoc>;
    const doc = new DocEntity(c.env, id);
    if (!await doc.exists()) return notFound(c, 'document not found');
    const updated = await doc.mutate(s => ({
      ...s,
      title: body.title?.trim() ?? s.title,
      content: body.content ?? s.content,
      updatedAt: Date.now(),
    }));
    return ok(c, updated);
  });
  app.get('/api/v1/documents', async (c) => {
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await DocEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : 20);
    return ok(c, page);
  });
  // COMMENTS (v1)
  app.get('/api/v1/comments/:docId', async (c) => {
    const docId = c.req.param('docId');
    const comments = await CommentEntity.listForDoc(c.env, docId);
    return ok(c, comments);
  });
  app.post('/api/v1/comments/:docId', async (c) => {
    const docId = c.req.param('docId');
    const body = await c.req.json() as Partial<Comment>;
    if (!body.content?.trim()) return bad(c, 'Content required');
    const now = Date.now();
    const comment: Comment = {
      id: crypto.randomUUID(),
      docId,
      parentId: body.parentId,
      authorName: body.authorName?.trim(),
      authorEmail: body.authorEmail?.trim(),
      content: body.content.trim(),
      position: body.position,
      createdAt: now,
      updatedAt: now,
    };
    await CommentEntity.create(c.env, comment);
    return ok(c, comment);
  });
  app.delete('/api/v1/comments/:docId/:commentId', async (c) => {
    const commentId = c.req.param('commentId');
    const deleted = await CommentEntity.delete(c.env, commentId);
    return ok(c, { deleted });
  });
  // Legacy fallback routes to prevent immediate breakage if frontend isn't updated
  app.get('/api/documents/:id', (c) => c.redirect(`/api/v1/documents/${c.req.param('id')}`));
  app.get('/api/documents', (c) => c.redirect('/api/v1/documents'));
}