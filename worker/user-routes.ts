import { Hono } from "hono";
import type { Env } from './core-utils';
import { DocEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { MarkdownDoc } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // DOCUMENTS
  app.get('/api/documents/:id', async (c) => {
    const id = c.req.param('id');
    const doc = new DocEntity(c.env, id);
    if (!await doc.exists()) return notFound(c, 'document not found');
    return ok(c, await doc.getState());
  });
  app.post('/api/documents', async (c) => {
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
  app.put('/api/documents/:id', async (c) => {
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
  app.get('/api/documents', async (c) => {
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await DocEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : 20);
    return ok(c, page);
  });
}