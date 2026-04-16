import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { uploadImage, imageUrl, safeAlt } from '@/lib/api-client';
import { toast } from 'sonner';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface ImageUploadButtonProps {
  /** Called with markdown image text to insert at the cursor. */
  onInsert: (markdown: string) => void;
  className?: string;
}

export function ImageUploadButton({ onInsert, className }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    // Filter individually — don't abort entire batch for one bad file
    const valid = Array.from(files).filter((file) => {
      if (file.size > MAX_SIZE) { toast.error(`${file.name} exceeds the 5 MB limit`); return false; }
      if (file.size === 0) { toast.error(`${file.name} is empty`); return false; }
      return true;
    });
    if (valid.length === 0) return;

    setUploading(true);
    try {
      // Upload all files in parallel, then batch-insert markdown
      const results = await Promise.allSettled(
        valid.map((file) => uploadImage(file)),
      );

      const lines: string[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const meta = result.value;
          const url = imageUrl(meta.id);
          lines.push(`![${safeAlt(meta.filename)}](${url})`);
        } else {
          const msg = result.reason instanceof Error ? result.reason.message : 'Upload failed';
          toast.error(msg);
        }
      }

      if (lines.length > 0) {
        onInsert(lines.join('\n'));
        toast.success(lines.length === 1 ? 'Image uploaded' : `${lines.length} images uploaded`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
      // Reset the input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            disabled={uploading}
            aria-label="Upload image"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Upload image</p>
        </TooltipContent>
      </Tooltip>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        aria-label="Choose image files to upload"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />
    </TooltipProvider>
  );
}
