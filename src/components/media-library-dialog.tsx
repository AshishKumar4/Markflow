import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Trash2,
  Loader2,
  Copy,
  ImageOff,
  Upload,
} from 'lucide-react';
import { fetchImages, deleteImage, uploadImage, imageUrl, safeAlt } from '@/lib/api-client';
import type { ImageMeta } from '@shared/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with markdown text to insert. */
  onInsert: (markdown: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Browsable gallery of all uploaded images with search, insert, and delete. */
export function MediaLibraryDialog({
  open,
  onOpenChange,
  onInsert,
}: MediaLibraryDialogProps) {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ImageMeta | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchImages();
      setImages(list);
    } catch (err) {
      console.error('Failed to load images', err);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadImages();
  }, [open, loadImages]);

  const filtered = search.trim()
    ? images.filter((img) =>
        img.filename.toLowerCase().includes(search.toLowerCase()),
      )
    : images;

  const handleInsert = (img: ImageMeta) => {
    const url = imageUrl(img.id);
    onInsert(`![${safeAlt(img.filename)}](${url})`);
    onOpenChange(false);
    toast.success('Image inserted');
  };

  const handleCopyUrl = (img: ImageMeta) => {
    const url = `${window.location.origin}${imageUrl(img.id)}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('URL copied'),
      () => toast.error('Failed to copy URL'),
    );
  };

  const handleDelete = async (img: ImageMeta) => {
    setDeletingId(img.id);
    setConfirmDelete(null);
    try {
      await deleteImage(img.id);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      toast.success(`Deleted ${img.filename}`);
    } catch (err) {
      console.error('Failed to delete image', err);
      toast.error('Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadInLibrary = async (files: FileList | File[]) => {
    // Filter individually — don't abort entire batch for one bad file
    const valid = Array.from(files).filter((file) => {
      if (file.size > MAX_SIZE) { toast.error(`${file.name} exceeds the 5 MB limit`); return false; }
      if (file.size === 0) { toast.error(`${file.name} is empty`); return false; }
      return true;
    });
    if (valid.length === 0) return;

    setUploading(true);
    const toastId = toast.loading(
      valid.length === 1 ? `Uploading ${valid[0].name}...` : `Uploading ${valid.length} images...`,
    );

    try {
      const results = await Promise.allSettled(
        valid.map((file) => uploadImage(file)),
      );
      toast.dismiss(toastId);

      let successCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          setImages((prev) => [result.value, ...prev]);
          successCount++;
        } else {
          const msg = result.reason instanceof Error ? result.reason.message : 'Upload failed';
          toast.error(msg);
        }
      }
      if (successCount > 0) {
        toast.success(
          successCount === 1 ? 'Image uploaded' : `${successCount} images uploaded`,
        );
      }
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="text-lg font-bold">Media Library</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {search.trim()
                ? `${filtered.length} of ${images.length} image${images.length !== 1 ? 's' : ''} matching "${search}"`
                : `${images.length} image${images.length !== 1 ? 's' : ''} uploaded. Click an image to insert it.`}
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search images..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button
              size="sm"
              className="h-9 gap-1.5 shrink-0"
              disabled={uploading}
              onClick={() => uploadInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload
            </Button>
            <input
              ref={uploadInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              aria-label="Choose image files to upload"
              onChange={(e) => {
                if (e.target.files) handleUploadInLibrary(e.target.files);
              }}
            />
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm font-medium">Loading images...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ImageOff className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">
                  {search.trim() ? 'No images match your search' : 'No images uploaded yet'}
                </p>
                <p className="text-xs mt-1">
                  {search.trim()
                    ? 'Try a different search term'
                    : 'Upload images using the button above, or drag & drop / paste in the editor'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map((img) => (
                    <motion.div
                      key={img.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Insert ${img.filename}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleInsert(img);
                        }
                      }}
                      className={cn(
                        'group relative rounded-xl border border-border bg-card overflow-hidden',
                        'hover:ring-2 hover:ring-indigo-500/50 hover:border-indigo-500/50',
                        'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none',
                        'transition-all cursor-pointer',
                      )}
                      onClick={() => handleInsert(img)}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center overflow-hidden">
                        {img.mimeType === 'image/svg+xml' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-4">
                            <ImageOff className="w-8 h-8 text-muted-foreground/50" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SVG</span>
                          </div>
                        ) : (
                          <img
                            src={imageUrl(img.id)}
                            alt={img.filename}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium truncate" title={img.filename}>
                          {img.filename}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatFileSize(img.size)} &middot; {formatDate(img.createdAt)}
                        </p>
                      </div>

                      {/* Hover / touch actions — visible on hover, focus-within, and always on mobile */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-lg shadow-md"
                          aria-label={`Copy URL for ${img.filename}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUrl(img);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 rounded-lg shadow-md"
                          aria-label={`Delete ${img.filename}`}
                          disabled={deletingId === img.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(img);
                          }}
                        >
                          {deletingId === img.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{confirmDelete?.filename}</strong>.
              Any documents referencing this image will show a broken link. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDelete) handleDelete(confirmDelete); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
