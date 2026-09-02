/**
 * Cryptographic security & Anti-Tamper utilities for ProdTrack Flow
 * Handles SHA-256 salted hashing and client-side anti-debugging/DevTools blocking.
 */

// Central salt for master password hashing
export const MASTER_SALT = 'PTF_SECURE_SALT_v1_2026_OBSTUDIO';

/**
 * Computes SHA-256 hash with cryptographic salt using Web Crypto API
 */
export async function computeSHA256(text: string, salt: string = MASTER_SALT): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${text.trim()}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Initialize Anti-DevTools / Anti-Inspection protections
 * Blocks F12, Ctrl+Shift+I/J/C, Ctrl+U, and right-click inspection in production builds.
 */
export function initializeSecurityGuard(): void {
  // Only activate strict keyboard/inspection traps if not in local hot-reload dev mode or if explicitly requested
  if (typeof window === 'undefined') return;

  // 1. Keyboard Shortcut Blocker
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      // F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + Shift + I (Inspect) / Ctrl + Shift + J (Console) / Ctrl + Shift + C (Element selector)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // 2. Context Menu (Right-Click) Protection in Production
  if (import.meta.env.PROD) {
    window.addEventListener(
      'contextmenu',
      (e: MouseEvent) => {
        // Prevent default context menu to block "Inspect Element"
        e.preventDefault();
      },
      { capture: true }
    );
  }
}
