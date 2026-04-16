/**
 * ImageStoreDO — Durable Object for binary image storage.
 *
 * Inspired by the SqliteFS chunking pattern: every image is split into
 * <=1.8 MB chunks stored as BLOB rows so we stay well within DO SQLite
 * per-row limits.  Metadata (filename, mime, size, etc.) lives in a
 * separate lightweight table for fast listing.
 */
import { DurableObject } from "cloudflare:workers";
import type { ImageMeta } from "@shared/types";

// 1.8 MB per chunk — matches the VFS pattern
const CHUNK_SIZE = 1800 * 1024;

// Hard cap: 5 MB per upload
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export class ImageStoreDO extends DurableObject {
  private initialized = false;

  /* ------------------------------------------------------------------ */
  /*  Schema                                                             */
  /* ------------------------------------------------------------------ */

  private ensureSchema() {
    if (this.initialized) return;

    // Check if table exists
    const rows = this.ctx.storage.sql
      .exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='images_meta'")
      .toArray();

    if (rows.length === 0) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE images_meta (
          id         TEXT    PRIMARY KEY,
          filename   TEXT    NOT NULL,
          mime_type  TEXT    NOT NULL,
          size       INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE images_data (
          image_id    TEXT    NOT NULL,
          chunk_index INTEGER NOT NULL,
          data        BLOB    NOT NULL,
          PRIMARY KEY (image_id, chunk_index)
        )
      `);
      this.ctx.storage.sql.exec(
        `CREATE INDEX idx_images_meta_created ON images_meta(created_at DESC)`
      );
    }
    this.initialized = true;
  }

  /* ------------------------------------------------------------------ */
  /*  RPC methods (called from the Worker via stub)                      */
  /* ------------------------------------------------------------------ */

  /** Store a new image.  `data` arrives as an ArrayBuffer. */
  async store(
    id: string,
    filename: string,
    mimeType: string,
    data: ArrayBuffer,
  ): Promise<ImageMeta> {
    this.ensureSchema();

    const size = data.byteLength;
    if (size > MAX_IMAGE_SIZE) {
      throw new Error(`Image exceeds maximum size of ${MAX_IMAGE_SIZE} bytes`);
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }

    const now = Date.now();
    const bytes = new Uint8Array(data);
    const chunkCount = Math.max(1, Math.ceil(size / CHUNK_SIZE));

    // Wrap in a transactionSync so the meta + all chunks are atomic
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        `INSERT INTO images_meta (id, filename, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?)`,
        id, filename, mimeType, size, now,
      );

      for (let i = 0; i < chunkCount; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, size);
        const chunk = bytes.slice(start, end);
        // Ensure exact-sized ArrayBuffer (no shared-buffer issues)
        const buf =
          chunk.byteOffset !== 0 || chunk.byteLength !== chunk.buffer.byteLength
            ? chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength)
            : chunk.buffer;
        this.ctx.storage.sql.exec(
          `INSERT INTO images_data (image_id, chunk_index, data) VALUES (?, ?, ?)`,
          id, i, buf as ArrayBuffer,
        );
      }
    });

    return { id, filename, mimeType, size, createdAt: now };
  }

  /** Read full image binary.  Returns null if not found. */
  async read(id: string): Promise<{ meta: ImageMeta; data: ArrayBuffer } | null> {
    this.ensureSchema();

    const metaRows = this.ctx.storage.sql
      .exec<{ id: string; filename: string; mime_type: string; size: number; created_at: number }>(
        `SELECT id, filename, mime_type, size, created_at FROM images_meta WHERE id = ?`, id,
      )
      .toArray();

    if (metaRows.length === 0) return null;

    const m = metaRows[0];
    const meta: ImageMeta = {
      id: m.id,
      filename: m.filename,
      mimeType: m.mime_type,
      size: m.size,
      createdAt: m.created_at,
    };

    const chunkRows = this.ctx.storage.sql
      .exec<{ data: ArrayBuffer }>(
        `SELECT data FROM images_data WHERE image_id = ? ORDER BY chunk_index`, id,
      )
      .toArray();

    if (chunkRows.length === 0) return null;

    // Single chunk — fast path
    if (chunkRows.length === 1) {
      return { meta, data: chunkRows[0].data };
    }

    // Multi-chunk — concatenate
    const totalSize = meta.size;
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const row of chunkRows) {
      const chunk = new Uint8Array(row.data);
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { meta, data: result.buffer as ArrayBuffer };
  }

  /** List all image metadata, newest first. */
  async listAll(): Promise<ImageMeta[]> {
    this.ensureSchema();

    const rows = this.ctx.storage.sql
      .exec<{ id: string; filename: string; mime_type: string; size: number; created_at: number }>(
        `SELECT id, filename, mime_type, size, created_at FROM images_meta ORDER BY created_at DESC`,
      )
      .toArray();

    return rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      mimeType: r.mime_type,
      size: r.size,
      createdAt: r.created_at,
    }));
  }

  /** Delete an image and its chunks. Returns true if it existed. */
  async remove(id: string): Promise<boolean> {
    this.ensureSchema();

    const existing = this.ctx.storage.sql
      .exec<{ id: string }>(`SELECT id FROM images_meta WHERE id = ?`, id)
      .toArray();

    if (existing.length === 0) return false;

    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(`DELETE FROM images_data WHERE image_id = ?`, id);
      this.ctx.storage.sql.exec(`DELETE FROM images_meta WHERE id = ?`, id);
    });

    return true;
  }
}
