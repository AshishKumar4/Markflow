import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
/**
 * Generate a secure Gravatar URL for an email.
 */
export function getGravatarUrl(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail)}&background=6366f1&color=fff&size=128`;
}
/**
 * Track owned comment IDs in local storage to allow deletion without auth.
 */
const OWNED_COMMENTS_KEY = 'markflow_owned_comments';
export function markCommentOwned(id: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(OWNED_COMMENTS_KEY) || '[]');
    localStorage.setItem(OWNED_COMMENTS_KEY, JSON.stringify([...existing, id]));
  } catch (e) {
    console.warn("Failed to update owned comments", e);
  }
}
export function isCommentOwned(id: string): boolean {
  try {
    const owned = JSON.parse(localStorage.getItem(OWNED_COMMENTS_KEY) || '[]');
    return Array.isArray(owned) && owned.includes(id);
  } catch (e) {
    return false;
  }
}
/**
 * Formats quoted text for annotation UI
 */
export function formatQuote(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
/**
 * Calculates vertical scroll progress
 */
export function getScrollPercentage() {
  const h = document.documentElement;
  const b = document.body;
  const st = 'scrollTop';
  const sh = 'scrollHeight';
  return (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight);
}
/**
 * Copy text to clipboard with feedback support
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}
/**
 * Checks if an element is visible within a specific scroll container
 */
export function isElementInViewport(el: HTMLElement, container?: HTMLElement | null) {
  const rect = el.getBoundingClientRect();
  if (container) {
    const containerRect = container.getBoundingClientRect();
    return (
      rect.top >= containerRect.top &&
      rect.bottom <= containerRect.bottom
    );
  }
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}