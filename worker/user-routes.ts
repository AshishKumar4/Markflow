import { Hono } from "hono";
import type { Env } from './core-utils';
import { DocEntity, CommentEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import { ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE } from './image-store';
import type { MarkdownDoc, Comment } from "@shared/types";

/** Infer MIME type from file extension when browser doesn't set file.type. */
function mimeFromExtension(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  };
  return ext ? map[ext] ?? null : null;
}

/** Get the single ImageStoreDO stub (one global instance for all images). */
function getImageStore(env: Env) {
  const id = env.ImageStoreDO.idFromName("global-images");
  return env.ImageStoreDO.get(id);
}

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
  // ─── IMAGES (v1) ────────────────────────────────────────────────────

  /** Upload an image (multipart/form-data with a `file` field). */
  app.post('/api/v1/images', async (c) => {
    try {
      const contentType = c.req.header('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return bad(c, 'Expected multipart/form-data');
      }

      const formData = await c.req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return bad(c, 'Missing "file" field in form data');
      }

      if (file.size === 0) {
        return bad(c, 'Empty file');
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return bad(c, `File too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
      }

      const mimeType = file.type || mimeFromExtension(file.name) || 'application/octet-stream';
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return bad(c, `Unsupported image type: ${mimeType}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`);
      }

      const id = crypto.randomUUID();
      // Sanitize filename: strip unsafe chars, limit length
      const rawName = file.name || `image-${id}`;
      const filename = rawName.replace(/[^\w\s.\-()]/g, '_').slice(0, 255);
      const arrayBuffer = await file.arrayBuffer();

      const store = getImageStore(c.env);
      const meta = await store.store(id, filename, mimeType, arrayBuffer);
      return ok(c, meta);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      return bad(c, msg);
    }
  });

  /** List all uploaded images (metadata only). */
  app.get('/api/v1/images', async (c) => {
    const store = getImageStore(c.env);
    const images = await store.listAll();
    return ok(c, images);
  });

  /**
   * Serve a raw image by ID.
   * Returns binary with correct Content-Type — used directly in <img> src / markdown.
   */
  app.get('/api/v1/images/:id', async (c) => {
    const id = c.req.param('id');
    const store = getImageStore(c.env);
    const result = await store.read(id);

    if (!result) return notFound(c, 'Image not found');

    // Sanitize filename for Content-Disposition header (prevent header injection)
    const safeName = result.meta.filename.replace(/["\r\n\\]/g, '_');

    // SVGs can contain JS — force download instead of inline rendering
    const disposition = result.meta.mimeType === 'image/svg+xml'
      ? `attachment; filename="${safeName}"`
      : `inline; filename="${safeName}"`;

    // Use c.body() instead of raw Response so Hono's CORS middleware headers are preserved
    return c.body(result.data, 200, {
      'Content-Type': result.meta.mimeType,
      'Content-Length': String(result.meta.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': disposition,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });
  });

  /** Delete an image by ID. */
  app.delete('/api/v1/images/:id', async (c) => {
    const id = c.req.param('id');
    const store = getImageStore(c.env);
    const deleted = await store.remove(id);
    if (!deleted) return notFound(c, 'Image not found');
    return ok(c, { deleted: true });
  });

  // Legacy fallback routes to prevent immediate breakage if frontend isn't updated
  app.get('/api/documents/:id', (c) => c.redirect(`/api/v1/documents/${c.req.param('id')}`));
  app.get('/api/documents', (c) => c.redirect('/api/v1/documents'));
}