/**
 * API configuration and base URL resolution.
 * Ensures that even when running inside an Android WebView (where the origin is
 * https://appassets.androidplatform.net) or from embedded blogspot pages,
 * API requests and download preparation always reach the live backend server.
 */

export const CANONICAL_BACKEND_URL =
  'https://ais-pre-gxyvg3phkakhlvxkyoqcx7-32286104148.asia-southeast1.run.app';

export function getBackendBaseUrl(): string {
  if (typeof window === 'undefined') {
    return CANONICAL_BACKEND_URL;
  }

  const origin = window.location.origin || '';
  const isAndroidAsset = origin.includes('appassets.androidplatform.net');
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  const isForeign =
    origin.includes('blogspot.') ||
    origin.includes('wordpress.') ||
    origin.includes('github.io');

  // If running directly on a live web deployment (e.g. Cloud Run), remember and use it!
  if (
    origin &&
    !isAndroidAsset &&
    !isLocal &&
    !isForeign &&
    (origin.startsWith('https://') || origin.startsWith('http://'))
  ) {
    try {
      localStorage.setItem('apk_creator_backend_url', origin);
    } catch (_) {}
    return origin;
  }

  // Check if we have a saved working backend origin
  try {
    const cached = localStorage.getItem('apk_creator_backend_url');
    if (
      cached &&
      !cached.includes('appassets.androidplatform.net') &&
      (cached.startsWith('https://') || cached.startsWith('http://'))
    ) {
      return cached.replace(/\/+$/, '');
    }
  } catch (_) {}

  return CANONICAL_BACKEND_URL;
}

export function buildApiUrl(path: string): string {
  const base = getBackendBaseUrl().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function isAppAssetsOrHashUrl(url?: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed.startsWith('#')) return true;
  if (trimmed.includes('appassets.androidplatform.net')) return true;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return true;
  return false;
}
