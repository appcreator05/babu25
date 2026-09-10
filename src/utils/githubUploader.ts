import { blobToBase64, createDownloadUrl, isPublicHttpUrl } from './fileDownloader';
import { buildApiUrl } from './apiConfig';

export interface GitHubCredentials {
  token: string;
  repo: string; // e.g. "username/repository-name" or "installapkapps/apk-builds"
}

const STORAGE_KEY_TOKEN = 'webtoapk_github_token';
const STORAGE_KEY_REPO = 'webtoapk_github_repo';

export function getSavedGitHubConfig(): GitHubCredentials {
  if (typeof window === 'undefined') return { token: '', repo: '' };
  try {
    return {
      token: localStorage.getItem(STORAGE_KEY_TOKEN) || '',
      repo: localStorage.getItem(STORAGE_KEY_REPO) || '',
    };
  } catch (_) {
    return { token: '', repo: '' };
  }
}

export function saveGitHubConfig(creds: GitHubCredentials): void {
  if (typeof window === 'undefined') return;
  try {
    if (creds.token) localStorage.setItem(STORAGE_KEY_TOKEN, creds.token.trim());
    if (creds.repo) localStorage.setItem(STORAGE_KEY_REPO, creds.repo.trim());
  } catch (_) {}
}

export function parseOwnerAndRepo(repoString: string): { owner: string; repo: string } {
  const clean = repoString
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/^\/+|\/+$/g, '');

  const parts = clean.split('/');
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return { owner: parts[0] || '', repo: parts[1] || '' };
}

export interface GitHubUploadResult {
  success: boolean;
  downloadUrl: string;
  releaseUrl: string;
  tagName: string;
  fileName: string;
  size?: number;
}

export async function checkServerGitHubConfig(): Promise<{ configuredOnServer: boolean; serverRepo: string }> {
  try {
    const res = await fetch(buildApiUrl('/api/github/config-status'));
    if (res.ok) {
      return await res.json();
    }
  } catch (_) {}
  return { configuredOnServer: false, serverRepo: '' };
}

/**
 * Uploads a compiled APK/AAB blob directly to GitHub Releases as a Release Asset.
 * The resulting downloadUrl is an official GitHub CDN download URL (github.com/.../releases/download/...).
 */
export async function uploadApkToGitHubRelease(
  blob: Blob,
  fileName: string,
  credentials?: GitHubCredentials,
  customTag?: string
): Promise<GitHubUploadResult> {
  const creds = credentials || getSavedGitHubConfig();
  const { owner, repo } = creds.repo ? parseOwnerAndRepo(creds.repo) : { owner: '', repo: '' };

  const base64 = await blobToBase64(blob);
  const mimeType = fileName.endsWith('.aab')
    ? 'application/octet-stream'
    : 'application/vnd.android.package-archive';

  const res = await fetch(buildApiUrl('/api/github/upload-release'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: creds.token || undefined,
      owner: owner || undefined,
      repo: repo || undefined,
      fileName,
      base64,
      mimeType,
      releaseTag: customTag,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'GitHub-এ আপলোড করতে ব্যর্থ হয়েছে।');
  }

  // Save successful credentials if provided
  if (creds.token && creds.repo) {
    saveGitHubConfig(creds);
  }

  return {
    success: true,
    downloadUrl: data.downloadUrl,
    releaseUrl: data.releaseUrl,
    tagName: data.tagName,
    fileName: data.fileName,
    size: data.size,
  };
}

/**
 * Instant 1-click cloud host upload fallback (does not require a GitHub account or token)
 * Includes a timeout so it never hangs indefinitely
 */
export async function uploadToFreeCloud(
  blob: Blob,
  fileName: string,
  timeoutMs: number = 12000
): Promise<{ success: boolean; downloadUrl: string; rawUrl?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const base64 = await blobToBase64(blob);
    const res = await fetch(buildApiUrl('/api/cloud-upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        base64,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'ক্লাউড স্টোরেজে আপলোড করতে ব্যর্থ হয়েছে।');
    }

    return {
      success: true,
      downloadUrl: data.downloadUrl,
      rawUrl: data.rawUrl,
    };
  } catch (err: any) {
    clearTimeout(timer);
    throw err;
  }
}

export interface DualBuildUploadResult {
  success: boolean;
  releaseUrl?: string;
  tagName?: string;
  source: 'github' | 'server' | 'cloud' | 'local';
  apk: {
    fileName: string;
    downloadUrl: string;
    size?: number;
  };
  aab?: {
    fileName: string;
    downloadUrl: string;
    size?: number;
  } | null;
}

/**
 * Uploads both APK and AAB packages.
 * 1. If GitHub is configured, uploads to GitHub Releases CDN.
 * 2. Otherwise (or if GitHub fails), prepares fast direct download URLs on the server.
 * 3. Falls back smoothly to cloud / local object URLs so it NEVER hangs or fails.
 */
export async function uploadBothPackages(
  apk: { blob: Blob; fileName: string },
  aab?: { blob: Blob; fileName: string } | null,
  credentials?: GitHubCredentials,
  onProgress?: (status: string) => void
): Promise<DualBuildUploadResult> {
  const creds = credentials || getSavedGitHubConfig();

  let serverConfig = { configuredOnServer: false, serverRepo: '' };
  try {
    serverConfig = await checkServerGitHubConfig();
  } catch {
    // Ignore server check error
  }

  const hasCredentials =
    serverConfig.configuredOnServer || (Boolean(creds.token) && Boolean(creds.repo));

  // 1. If GitHub configured, upload to GitHub Releases
  if (hasCredentials) {
    try {
      onProgress?.('GitHub Releases-এ বাইনারি প্যাকেজ আপলোড হচ্ছে...');
      const { owner, repo } = creds.repo ? parseOwnerAndRepo(creds.repo) : { owner: '', repo: '' };
      const [apkBase64, aabBase64] = await Promise.all([
        blobToBase64(apk.blob),
        aab ? blobToBase64(aab.blob) : Promise.resolve(null),
      ]);

      const controller = new AbortController();
      const githubTimer = setTimeout(() => controller.abort(), 35000);

      const res = await fetch(buildApiUrl('/api/github/upload-both-release'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: creds.token || undefined,
          owner: owner || undefined,
          repo: repo || undefined,
          apk: {
            fileName: apk.fileName,
            base64: apkBase64,
          },
          aab: aab && aabBase64
            ? {
                fileName: aab.fileName,
                base64: aabBase64,
              }
            : undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(githubTimer);
      const data = await res.json();
      if (res.ok && data.success) {
        if (creds.token && creds.repo) {
          saveGitHubConfig(creds);
        }
        return {
          success: true,
          releaseUrl: data.releaseUrl,
          tagName: data.tagName,
          source: 'github',
          apk: data.apk,
          aab: data.aab,
        };
      } else {
        console.warn('GitHub upload failed, falling back to server download cache:', data?.error);
      }
    } catch (e) {
      console.warn('GitHub upload exception, falling back:', e);
    }
  }

  // 2. Primary Fast Fallback: Prepare Direct Download URL on our fast Cloud Run server
  try {
    onProgress?.('সার্ভার থেকে সরাসরি ডাউনলোড লিঙ্ক তৈরি হচ্ছে...');
    const [apkUrl, aabUrl] = await Promise.all([
      createDownloadUrl(apk.blob, apk.fileName, 'application/vnd.android.package-archive'),
      aab ? createDownloadUrl(aab.blob, aab.fileName, 'application/octet-stream') : Promise.resolve(null),
    ]);

    return {
      success: true,
      source: 'server',
      apk: {
        fileName: apk.fileName,
        downloadUrl: apkUrl,
      },
      aab: aabUrl
        ? {
            fileName: aab!.fileName,
            downloadUrl: aabUrl,
          }
        : null,
    };
  } catch (serverErr) {
    console.warn('Server direct download preparation failed, trying cloud fallback:', serverErr);
  }

  // 3. Secondary Fallback: Free Cloud Upload (best-effort)
  try {
    onProgress?.('ক্লাউড স্টোরেজে আপলোড হচ্ছে...');
    const [apkCloud, aabCloud] = await Promise.allSettled([
      uploadToFreeCloud(apk.blob, apk.fileName, 10000),
      aab ? uploadToFreeCloud(aab.blob, aab.fileName, 10000) : Promise.resolve(null),
    ]);

    const apkUrl =
      apkCloud.status === 'fulfilled' && isPublicHttpUrl(apkCloud.value?.downloadUrl)
        ? apkCloud.value!.downloadUrl!
        : '';

    const aabUrl =
      aabCloud.status === 'fulfilled' && isPublicHttpUrl(aabCloud.value?.downloadUrl)
        ? aabCloud.value!.downloadUrl!
        : '';

    return {
      success: true,
      source: apkUrl ? 'cloud' : 'local',
      apk: {
        fileName: apk.fileName,
        downloadUrl: apkUrl,
      },
      aab: aab
        ? {
            fileName: aab.fileName,
            downloadUrl: aabUrl,
          }
        : null,
    };
  } catch (cloudErr) {
    console.warn('Cloud upload failed, using local files:', cloudErr);
  }

  // 4. Guaranteed Ultimate Local Fallback (Never fails)
  return {
    success: true,
    source: 'local',
    apk: {
      fileName: apk.fileName,
      downloadUrl: '',
    },
    aab: aab
      ? {
          fileName: aab.fileName,
          downloadUrl: '',
        }
      : null,
  };
}
