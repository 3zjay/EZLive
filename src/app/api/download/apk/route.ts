import { NextRequest, NextResponse } from 'next/server';
import { APP_VERSION, APP_BUILD, APP_FULL_VERSION } from '@/constants/version';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wantsInfo = searchParams.get('info') === 'true';

  let downloadUrl = 'https://github.com/3zjay/EZLive/releases/download/latest-apk/EZLiveStudio.apk';
  let assetName = 'EZLiveStudio.apk';
  let releaseData: any = null;

  try {
    const res = await fetch('https://api.github.com/repos/3zjay/EZLive/releases', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'EZLiveStudio-Downloader',
      },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const releases = await res.json();
      if (Array.isArray(releases) && releases.length > 0) {
        // Find latest-apk release or use the latest release
        const targetRelease =
          releases.find((r: any) => r.tag_name === 'latest-apk') || releases[0];
        releaseData = targetRelease;

        if (targetRelease?.assets && Array.isArray(targetRelease.assets)) {
          // Prefer generic EZLiveStudio.apk or versioned apk
          const apkAsset =
            targetRelease.assets.find((a: any) => a.name === 'EZLiveStudio.apk') ||
            targetRelease.assets.find((a: any) => a.name?.endsWith('.apk'));

          if (apkAsset?.browser_download_url) {
            downloadUrl = apkAsset.browser_download_url;
            assetName = apkAsset.name;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[APK Download] Failed to fetch latest release from GitHub API, using fallback URL:', err);
  }

  if (wantsInfo) {
    return NextResponse.json({
      appVersion: APP_VERSION,
      appBuild: APP_BUILD,
      fullVersion: APP_FULL_VERSION,
      assetName,
      downloadUrl,
      releasesPage: 'https://github.com/3zjay/EZLive/releases',
      tagPage: 'https://github.com/3zjay/EZLive/releases/tag/latest-apk',
      release: releaseData
        ? {
            tagName: releaseData.tag_name,
            name: releaseData.name,
            publishedAt: releaseData.published_at,
          }
        : null,
    });
  }

  // Redirect client directly to the fresh download asset URL with anti-cache headers
  const response = NextResponse.redirect(downloadUrl, {
    status: 302,
  });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}
