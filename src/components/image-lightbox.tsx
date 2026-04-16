import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageLightboxProps {
  /** Image URL to display. Mutually exclusive with svgContent. */
  src?: string;
  /** Raw SVG markup to render at full size. */
  svgContent?: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;
/** Viewport margin (fraction) used when computing fit-to-screen zoom. */
const FIT_MARGIN_X = 0.90;
const FIT_MARGIN_Y = 0.82; // leave room for toolbar

/** Full-screen lightbox with zoom, pan, and close for images and SVG diagrams. */
export function ImageLightbox({ src, svgContent, alt, open, onClose }: ImageLightboxProps) {
  // `zoom` is the absolute scale factor applied to the content.
  // For SVGs it starts at fitZoom (fit-to-screen); for images it starts at 1.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [fitZoom, setFitZoom] = useState(1);
  const [measured, setMeasured] = useState(false);

  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // ── Measure SVG natural size and compute fit-to-screen zoom ──────────
  useLayoutEffect(() => {
    if (!open || !svgContent) {
      setMeasured(false);
      return;
    }

    // Allow the DOM to render the SVG first, then measure
    const raf = requestAnimationFrame(() => {
      const wrapper = svgWrapperRef.current;
      if (!wrapper) return;

      const svgEl = wrapper.querySelector('svg');
      if (!svgEl) return;

      // Get the natural dimensions from the SVG element
      const naturalW = svgEl.scrollWidth || svgEl.getBoundingClientRect().width;
      const naturalH = svgEl.scrollHeight || svgEl.getBoundingClientRect().height;

      if (naturalW === 0 || naturalH === 0) return;

      const vw = window.innerWidth * FIT_MARGIN_X;
      const vh = window.innerHeight * FIT_MARGIN_Y;

      const fit = Math.min(vw / naturalW, vh / naturalH, 1);
      setFitZoom(fit);
      setZoom(fit);
      setPan({ x: 0, y: 0 });
      setMeasured(true);
    });

    return () => cancelAnimationFrame(raf);
  }, [open, svgContent]);

  // Reset state for images (non-SVG)
  useEffect(() => {
    if (open && !svgContent) {
      setFitZoom(1);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setMeasured(true);
    }
  }, [open, svgContent]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // ── Zoom helpers ─────────────────────────────────────────────────────
  const clampZoom = useCallback(
    (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)),
    [],
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => clampZoom(z + ZOOM_STEP));
  }, [clampZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => clampZoom(z - ZOOM_STEP));
  }, [clampZoom]);

  const handleReset = useCallback(() => {
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }, [fitZoom]);

  // Scroll wheel zoom — zoom toward cursor position
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => clampZoom(z + delta));
    },
    [clampZoom],
  );

  // ── Pan via pointer drag (always enabled) ────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only drag on primary button (not right-click, etc.)
      if (e.button !== 0) return;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pan],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    },
    [dragging],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Close when clicking the backdrop itself (not content) and not dragging
  const pointerDownOnBackdrop = useRef(false);
  const handleBackdropPointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownOnBackdrop.current = e.target === e.currentTarget;
  }, []);
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && pointerDownOnBackdrop.current && !dragging) {
        onClose();
      }
      pointerDownOnBackdrop.current = false;
    },
    [onClose, dragging],
  );

  const zoomPercent = Math.round(zoom * 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm print:hidden select-none"
          role="dialog"
          aria-label={alt || 'Image viewer'}
          aria-modal="true"
          onPointerDown={(e) => {
            handleBackdropPointerDown(e);
            handlePointerDown(e);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleBackdropClick}
          onWheel={handleWheel}
          style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-[210] rounded-full bg-white/10 hover:bg-white/20 text-white h-10 w-10"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Zoom toolbar */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[210] flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2 py-1.5 border border-white/10"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-white hover:bg-white/10"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              disabled={zoom <= MIN_ZOOM}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-[11px] font-bold text-white/80 w-12 text-center tabular-nums select-none">
              {zoomPercent}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-white hover:bg-white/10"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              disabled={zoom >= MAX_ZOOM}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-white hover:bg-white/10"
              onClick={handleReset}
              aria-label="Fit to screen"
              title="Fit to screen"
            >
              <Maximize className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* ── Content: positioned at center of viewport, then transformed ── */}
          <div
            className="absolute top-1/2 left-1/2 origin-center pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragging ? 'none' : 'transform 0.15s ease-out',
              willChange: 'transform',
            }}
          >
            {svgContent ? (
              <div
                ref={svgWrapperRef}
                className="lightbox-svg bg-white rounded-xl p-6 shadow-2xl"
                style={{
                  // Don't constrain — let SVG render at natural size;
                  // the scale transform handles fitting to viewport.
                  visibility: measured ? 'visible' : 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : src ? (
              <img
                src={src}
                alt={alt || ''}
                className="rounded-xl select-none shadow-2xl"
                style={{
                  maxHeight: `${85 / zoom}vh`,
                  maxWidth: `${90 / zoom}vw`,
                  objectFit: 'contain',
                }}
                draggable={false}
              />
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
