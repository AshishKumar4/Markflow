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
 * Checks if an element is visible within a specific scroll container
 */
export function isElementInViewport(el: HTMLElement, container: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return (
    rect.top >= containerRect.top &&
    rect.bottom <= containerRect.bottom
  );
}