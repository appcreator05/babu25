import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for all API requests (supports WebView and mobile cross-origin access)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Allow large payloads up to 100MB for APK/AAB/ZIP binaries
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Persistent disk storage directory for APK downloads (survives process restarts)
  const DISK_CACHE_DIR = path.join(os.tmpdir(), 'apk_download_storage');
  try {
    if (!fs.existsSync(DISK_CACHE_DIR)) {
      fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Failed to ensure DISK_CACHE_DIR:', err);
  }

  // In-memory download storage with 48-hour TTL
  interface StoredDownload {
    buffer?: Buffer;
    filePath?: string;
    fileName: string;
    mimeType: string;
    createdAt: number;
  }
  const downloadCache = new Map<string, StoredDownload>();

  // Cleanup expired downloads every 30 minutes (48 hours retention)
  const MAX_DOWNLOAD_AGE_MS = 48 * 3600 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [id, item] of downloadCache.entries()) {
      if (now - item.createdAt > MAX_DOWNLOAD_AGE_MS) {
        downloadCache.delete(id);
        if (item.filePath && fs.existsSync(item.filePath)) {
          try {
            fs.unlinkSync(item.filePath);
            const metaPath = item.filePath.replace(/\.bin$/, '.json');
            if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
          } catch {}
        }
      }
    }
  }, 30 * 60 * 1000);

  // API to prepare a direct URL download
  app.post('/api/prepare-download', (req, res) => {
    try {
      const { fileName, base64, mimeType } = req.body;
      if (!fileName || !base64) {
        return res.status(400).json({ error: 'Missing fileName or base64 data' });
      }

      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
      const buffer = Buffer.from(cleanBase64, 'base64');
      const id = Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);

      const targetFileName = fileName.trim() || 'app.apk';
      const targetMimeType = mimeType || 'application/vnd.android.package-archive';

      // Save to disk for durability across container restarts
      const diskFilePath = path.join(DISK_CACHE_DIR, `${id}.bin`);
      const diskMetaPath = path.join(DISK_CACHE_DIR, `${id}.json`);
      try {
        fs.writeFileSync(diskFilePath, buffer);
        fs.writeFileSync(
          diskMetaPath,
          JSON.stringify({
            fileName: targetFileName,
            mimeType: targetMimeType,
            createdAt: Date.now(),
          })
        );
      } catch (diskErr) {
        console.warn('Could not write download to disk cache:', diskErr);
      }

      downloadCache.set(id, {
        buffer,
        filePath: diskFilePath,
        fileName: targetFileName,
        mimeType: targetMimeType,
        createdAt: Date.now(),
      });

      const downloadPath = `/api/download/${id}/${encodeURIComponent(targetFileName)}`;
      const forwardedHost = req.get('x-forwarded-host');
      const host = forwardedHost ? forwardedHost.split(',')[0].trim() : (req.get('host') || 'localhost:3000');
      const forwardedProto = req.get('x-forwarded-proto');
      const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : (req.protocol || 'https');
      const fullUrl = `${proto}://${host}${downloadPath}`;

      return res.json({
        success: true,
        id,
        downloadUrl: fullUrl,
        downloadPath,
        fileName: targetFileName,
        size: buffer.length,
      });
    } catch (e: any) {
      console.error('prepare-download error:', e);
      return res.status(500).json({ error: e.message || 'Failed to prepare download' });
    }
  });

  // API to stream the file as a native attachment download for Chrome / Custom Tabs
  app.get('/api/download/:id/:fileName', (req, res) => {
    const { id } = req.params;
    let file = downloadCache.get(id);

    // If not found in memory, check disk cache
    if (!file) {
      const diskFilePath = path.join(DISK_CACHE_DIR, `${id}.bin`);
      const diskMetaPath = path.join(DISK_CACHE_DIR, `${id}.json`);
      if (fs.existsSync(diskFilePath) && fs.existsSync(diskMetaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(diskMetaPath, 'utf8'));
          const buffer = fs.readFileSync(diskFilePath);
          file = {
            buffer,
            filePath: diskFilePath,
            fileName: meta.fileName,
            mimeType: meta.mimeType,
            createdAt: meta.createdAt || Date.now(),
          };
          downloadCache.set(id, file);
        } catch (e) {
          console.warn('Failed to recover file from disk cache:', e);
        }
      }
    }

    if (!file || (!file.buffer && (!file.filePath || !fs.existsSync(file.filePath)))) {
      return res
        .status(404)
        .send(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Download Expired</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0f172a;color:#e2e8f0;"><h2>ডাউনলোড লিংকটি পাওয়া যায়নি বা মেয়াদোত্তীর্ণ হয়েছে</h2><p>অনুগ্রহ করে অ্যাপে ফিরে এসে আবার "Download" বাটনে ক্লিক করুন।</p></body></html>'
        );
    }

    const fileBuffer = file.buffer || fs.readFileSync(file.filePath!);

    // Set standard binary attachment headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
    );
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.send(fileBuffer);
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      activeDownloads: downloadCache.size,
      timestamp: new Date().toISOString(),
    });
  });

  // Check GitHub config status
  app.get('/api/github/config-status', (_req, res) => {
    const hasEnvToken = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim());
    const envRepo = process.env.GITHUB_REPO ? process.env.GITHUB_REPO.trim() : '';
    return res.json({
      configuredOnServer: hasEnvToken && Boolean(envRepo),
      serverRepo: envRepo,
    });
  });

  // API to upload an APK/AAB to GitHub Releases
  app.post('/api/github/upload-release', async (req, res) => {
    try {
      const { token, owner, repo, fileName, base64, mimeType, releaseTag, releaseName } = req.body;

      const cleanToken = (token && token.trim()) || (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) || '';
      
      let cleanOwner = (owner && owner.trim()) || '';
      let cleanRepo = (repo && repo.trim()) || '';

      if ((!cleanOwner || !cleanRepo) && process.env.GITHUB_REPO) {
        const parsed = process.env.GITHUB_REPO.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').split('/');
        cleanOwner = cleanOwner || parsed[0] || '';
        cleanRepo = cleanRepo || parsed[1] || '';
      }

      if (!cleanToken) {
        return res.status(400).json({ error: 'GitHub Personal Access Token is required' });
      }
      if (!cleanOwner || !cleanRepo) {
        return res.status(400).json({ error: 'GitHub owner and repository name are required' });
      }
      if (!fileName || !base64) {
        return res.status(400).json({ error: 'File name and base64 content are required' });
      }

      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
      const fileBuffer = Buffer.from(cleanBase64, 'base64');
      const targetMime = mimeType || 'application/vnd.android.package-archive';
      const cleanFileName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');

      const tag = releaseTag || `v1.0.${Date.now()}`;
      const name = releaseName || `Release ${cleanFileName} (${new Date().toLocaleDateString()})`;

      cleanRepo = cleanRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');

      // 1. Create a GitHub Release
      const releaseRes = await fetch(`https://api.github.com/repos/${cleanOwner}/${cleanRepo}/releases`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'WebToApkCreator-Agent',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_name: tag,
          name: name,
          body: `🚀 Automated build asset created by Web to APK Creator on ${new Date().toUTCString()}.\n\n- **File Name:** \`${cleanFileName}\`\n- **Size:** ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB\n- **Direct Download:** Official GitHub Release Asset`,
          draft: false,
          prerelease: false,
        }),
      });

      if (!releaseRes.ok) {
        const errText = await releaseRes.text();
        let parsedMessage = errText;
        try {
          const parsed = JSON.parse(errText);
          parsedMessage = parsed.message || errText;
        } catch (_) {}
        return res.status(releaseRes.status).json({
          error: `GitHub Release creation failed: ${parsedMessage}`,
          details: errText,
        });
      }

      const releaseData = await releaseRes.json();
      const releaseId = releaseData.id;

      // 2. Upload asset binary to the created release
      const uploadUrl = `https://uploads.github.com/repos/${cleanOwner}/${cleanRepo}/releases/${releaseId}/assets?name=${encodeURIComponent(cleanFileName)}`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'WebToApkCreator-Agent',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': targetMime,
          'Content-Length': fileBuffer.length.toString(),
        },
        body: fileBuffer,
      });

      if (!uploadRes.ok) {
        const uploadErrText = await uploadRes.text();
        return res.status(uploadRes.status).json({
          error: `Asset upload to GitHub failed: ${uploadErrText}`,
          releaseUrl: releaseData.html_url,
        });
      }

      const assetData = await uploadRes.json();

      return res.json({
        success: true,
        downloadUrl: assetData.browser_download_url,
        releaseUrl: releaseData.html_url,
        tagName: releaseData.tag_name,
        fileName: cleanFileName,
        size: assetData.size,
      });
    } catch (err: any) {
      console.error('github/upload-release error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error during GitHub upload' });
    }
  });

  // API to upload BOTH APK and AAB to a single GitHub Release
  app.post('/api/github/upload-both-release', async (req, res) => {
    try {
      const { token, owner, repo, releaseTag, releaseName, apk, aab } = req.body;

      const cleanToken = (token && token.trim()) || (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) || '';
      
      let cleanOwner = (owner && owner.trim()) || '';
      let cleanRepo = (repo && repo.trim()) || '';

      if ((!cleanOwner || !cleanRepo) && process.env.GITHUB_REPO) {
        const parsed = process.env.GITHUB_REPO.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').split('/');
        cleanOwner = cleanOwner || parsed[0] || '';
        cleanRepo = cleanRepo || parsed[1] || '';
      }

      if (!cleanToken) {
        return res.status(400).json({ error: 'GitHub Personal Access Token is required' });
      }
      if (!cleanOwner || !cleanRepo) {
        return res.status(400).json({ error: 'GitHub owner and repository name are required' });
      }
      if (!apk || !apk.base64) {
        return res.status(400).json({ error: 'APK binary data is required' });
      }

      cleanRepo = cleanRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');

      const tag = releaseTag || `v1.0.${Date.now()}`;
      const name = releaseName || `Release ${tag} (${new Date().toLocaleDateString()})`;

      // 1. Create Release
      const releaseRes = await fetch(`https://api.github.com/repos/${cleanOwner}/${cleanRepo}/releases`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'WebToApkCreator-Agent',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_name: tag,
          name: name,
          body: `🚀 Automated build release containing APK and AAB packages.\n\nGenerated on ${new Date().toUTCString()} by Web to APK Creator.`,
          draft: false,
          prerelease: false,
        }),
      });

      if (!releaseRes.ok) {
        const errText = await releaseRes.text();
        let parsedMessage = errText;
        try {
          const parsed = JSON.parse(errText);
          parsedMessage = parsed.message || errText;
        } catch (_) {}
        return res.status(releaseRes.status).json({
          error: `GitHub Release creation failed: ${parsedMessage}`,
          details: errText,
        });
      }

      const releaseData = await releaseRes.json();
      const releaseId = releaseData.id;

      // Helper function to upload an asset
      const uploadSingleAsset = async (fileName: string, base64Data: string, mime: string) => {
        const cleanB64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const buffer = Buffer.from(cleanB64, 'base64');
        const cleanName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
        const uploadUrl = `https://uploads.github.com/repos/${cleanOwner}/${cleanRepo}/releases/${releaseId}/assets?name=${encodeURIComponent(cleanName)}`;

        const upRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'WebToApkCreator-Agent',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': mime,
            'Content-Length': buffer.length.toString(),
          },
          body: buffer,
        });

        if (!upRes.ok) {
          const err = await upRes.text();
          throw new Error(`Failed to upload ${cleanName}: ${err}`);
        }
        return await upRes.json();
      };

      // 2. Upload APK
      const apkFileName = apk.fileName || 'app-release.apk';
      const apkAsset = await uploadSingleAsset(
        apkFileName,
        apk.base64,
        'application/vnd.android.package-archive'
      );

      // 3. Upload AAB if provided
      let aabAsset = null;
      if (aab && aab.base64) {
        const aabFileName = aab.fileName || 'app-release.aab';
        aabAsset = await uploadSingleAsset(
          aabFileName,
          aab.base64,
          'application/octet-stream'
        );
      }

      return res.json({
        success: true,
        releaseUrl: releaseData.html_url,
        tagName: releaseData.tag_name,
        apk: {
          fileName: apkFileName,
          downloadUrl: apkAsset.browser_download_url,
          size: apkAsset.size,
        },
        aab: aabAsset
          ? {
              fileName: aab.fileName || 'app-release.aab',
              downloadUrl: aabAsset.browser_download_url,
              size: aabAsset.size,
            }
          : null,
      });
    } catch (err: any) {
      console.error('github/upload-both-release error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error during GitHub upload' });
    }
  });

  // API to upload file to free public cloud storage (tmpfiles.org) as instant 1-click fallback
  app.post('/api/cloud-upload', async (req, res) => {
    try {
      const { fileName, base64 } = req.body;
      if (!fileName || !base64) {
        return res.status(400).json({ error: 'Missing fileName or base64' });
      }

      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
      const fileBuffer = Buffer.from(cleanBase64, 'base64');
      const cleanFileName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_') || 'app.apk';

      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/vnd.android.package-archive' });
      formData.append('file', blob, cleanFileName);

      const response = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Cloud host returned status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.data && data.data.url) {
        // tmpfiles.org URLs have the format https://tmpfiles.org/12345/filename.apk
        // Direct download URL requires changing https://tmpfiles.org/ to https://tmpfiles.org/dl/
        const rawUrl = data.data.url as string;
        const directUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        return res.json({
          success: true,
          downloadUrl: directUrl,
          rawUrl,
          fileName: cleanFileName,
        });
      }

      return res.status(500).json({ error: 'Failed to obtain direct URL from cloud storage' });
    } catch (err: any) {
      console.error('cloud-upload error:', err);
      return res.status(500).json({ error: err.message || 'Cloud upload failed' });
    }
  });

  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
