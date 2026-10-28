import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const customAppId = req.cookies.get('fb_custom_app_id')?.value;
  const appId =
    customAppId ||
    process.env.FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    '1519191979811970';

  const appSecret = process.env.FACEBOOK_APP_SECRET || 'acc72325d5ac75f52fdb617ca2623033';

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = `${proto}://${host}/api/auth/facebook/callback`;

  // Handle user cancelled or Facebook returned an error
  if (error || !code) {
    const errorMsg = errorDescription || error || 'Facebook authentication was cancelled.';
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Authentication Failed</title></head>
<body style="background:#080605;color:#f87171;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
  <div style="background:#140e0c;border:1px solid #7f1d1d;border-radius:16px;padding:32px;max-width:440px;">
    <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
    <h3 style="margin:0 0 8px 0;color:#fca5a5;">Authentication Cancelled</h3>
    <p style="color:#a8a29e;font-size:13px;line-height:1.5;">${escapeHtml(errorMsg)}</p>
    <button onclick="window.close()" style="margin-top:20px;padding:8px 20px;background:#262626;color:#e5e5e5;border:1px solid #404040;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">Close Window</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'FB_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
      setTimeout(function() { window.close(); }, 2000);
    }
  </script>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  if (!appId || !appSecret) {
    const msg =
      'Facebook App credentials not fully configured. Please set FACEBOOK_APP_SECRET in your server environment variables.';
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Configuration Needed</title></head>
<body style="background:#080605;color:#f2ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
  <div style="background:#140e0c;border:1px solid #f59e0b;border-radius:16px;padding:32px;max-width:480px;">
    <div style="font-size:36px;margin-bottom:12px;">🔑</div>
    <h3 style="margin:0 0 8px 0;color:#fbbf24;">Server Setup Required</h3>
    <p style="color:#d6d3d1;font-size:13px;line-height:1.5;">${escapeHtml(msg)}</p>
    <button onclick="window.close()" style="margin-top:20px;padding:8px 20px;background:#262626;color:#e5e5e5;border:1px solid #404040;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">Close</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'FB_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
    }
  </script>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  try {
    // 1. Exchange authorization code for short-lived user access token
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Failed to exchange OAuth code for token');
    }

    let finalAccessToken = tokenData.access_token;

    // 2. Exchange for 60-day Long-Lived Token
    try {
      const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
      longLivedUrl.searchParams.set('client_id', appId);
      longLivedUrl.searchParams.set('client_secret', appSecret);
      longLivedUrl.searchParams.set('fb_exchange_token', finalAccessToken);

      const longRes = await fetch(longLivedUrl.toString());
      const longData = await longRes.json();
      if (longData.access_token) {
        finalAccessToken = longData.access_token;
      }
    } catch (e) {
      console.warn('Long-lived token exchange warning:', e);
    }

    // 3. Fetch authenticated Facebook user profile
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(finalAccessToken)}`
    );
    const profileData = await profileRes.json();

    const userData = {
      id: profileData.id || '',
      name: profileData.name || 'Facebook User',
      email: profileData.email || '',
      picture: profileData.picture?.data?.url || '',
    };

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Connected to Facebook</title></head>
<body style="background:#080605;color:#f2ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
  <div style="background:#140e0c;border:1px solid #16a34a;border-radius:16px;padding:32px;max-width:440px;">
    <div style="width:48px;height:48px;background:#1877f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;color:white;font-weight:900;font-size:24px;">f</div>
    <h3 style="margin:0 0 8px 0;color:#4ade80;">Successfully Connected!</h3>
    <p style="color:#d6d3d1;font-size:13px;line-height:1.5;">Linked Facebook account: <strong>${escapeHtml(userData.name)}</strong></p>
    <p style="color:#78716c;font-size:11px;margin-top:8px;">Returning to EZLive Studio...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'FB_AUTH_SUCCESS',
        token: ${JSON.stringify(finalAccessToken)},
        user: ${JSON.stringify(userData)}
      }, '*');
      setTimeout(function() { window.close(); }, 800);
    } else {
      window.location.href = '/studio';
    }
  </script>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to authenticate with Facebook';
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Authentication Error</title></head>
<body style="background:#080605;color:#f87171;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
  <div style="background:#140e0c;border:1px solid #7f1d1d;border-radius:16px;padding:32px;max-width:440px;">
    <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
    <h3 style="margin:0 0 8px 0;color:#fca5a5;">OAuth Error</h3>
    <p style="color:#a8a29e;font-size:13px;line-height:1.5;">${escapeHtml(errorMsg)}</p>
    <button onclick="window.close()" style="margin-top:20px;padding:8px 20px;background:#262626;color:#e5e5e5;border:1px solid #404040;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">Close</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'FB_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
    }
  </script>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
