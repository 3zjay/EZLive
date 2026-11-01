import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const customAppId = req.cookies.get('fb_custom_app_id')?.value;
  const returnTo = req.cookies.get('fb_return_to')?.value || '/studio';
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
    <a href=${JSON.stringify(returnTo)} onclick="try{window.close();}catch(e){}" style="display:inline-block;text-decoration:none;margin-top:20px;padding:10px 24px;background:#e8430a;color:#ffffff;border-radius:10px;font-size:13px;font-weight:bold;cursor:pointer;">Return to EZLive Studio</a>
  </div>
  <script>
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'FB_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
      } catch (e) {}
      setTimeout(function() {
        try { window.close(); } catch (e) {}
      }, 1500);
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
    <a href=${JSON.stringify(returnTo)} onclick="try{window.close();}catch(e){}" style="display:inline-block;text-decoration:none;margin-top:20px;padding:10px 24px;background:#e8430a;color:#ffffff;border-radius:10px;font-size:13px;font-weight:bold;cursor:pointer;">Return to EZLive Studio</a>
  </div>
  <script>
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'FB_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
      } catch (e) {}
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

    const payload = {
      type: 'FB_AUTH_SUCCESS',
      token: finalAccessToken,
      user: userData,
    };

    const response = new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Connected to Facebook</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="1;url=${escapeHtml(returnTo)}" />
</head>
<body style="background:#080605;color:#f2ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
  <div style="background:#140e0c;border:1px solid #16a34a;border-radius:16px;padding:32px;max-width:440px;width:100%;">
    <div style="width:48px;height:48px;background:#1877f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;color:white;font-weight:900;font-size:24px;">f</div>
    <h3 style="margin:0 0 8px 0;color:#4ade80;">Successfully Connected!</h3>
    <p style="color:#d6d3d1;font-size:13px;line-height:1.5;">Linked Facebook account: <strong>${escapeHtml(userData.name)}</strong></p>
    <p style="color:#78716c;font-size:11px;margin-top:8px;">Returning to EZLive Studio automatically...</p>
    <a href=${JSON.stringify(returnTo)} onclick="try{window.close();}catch(e){}" style="display:inline-block;text-decoration:none;margin-top:18px;padding:12px 24px;background:linear-gradient(90deg,#e8430a,#ff6b1a);color:#ffffff;border-radius:12px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;box-shadow:0 6px 20px rgba(232,67,10,0.35);">Continue to Studio →</a>
  </div>
  <script>
    (function() {
      var payload = ${JSON.stringify(payload)};
      var targetUrl = ${JSON.stringify(returnTo)};
      try {
        localStorage.setItem('fb_user_access_token', payload.token);
        if (payload.user && payload.user.name) localStorage.setItem('fb_user_name', payload.user.name);
        if (payload.user && payload.user.picture) localStorage.setItem('fb_user_picture', payload.user.picture);
        if (payload.user && payload.user.email) localStorage.setItem('hc_session_user', payload.user.email);
        localStorage.setItem('fb_auth_callback_payload', JSON.stringify(payload));
      } catch (e) {}

      try {
        var bc = new BroadcastChannel('ezlive_auth_channel');
        bc.postMessage(payload);
        setTimeout(function() { try { bc.close(); } catch (e) {} }, 300);
      } catch (e) {}

      if (window.opener) {
        try {
          window.opener.postMessage(payload, '*');
        } catch (e) {}
        try {
          window.close();
        } catch (e) {}
        // Fallback: on Android WebView or mobile tabs where window.close() is ignored by the OS,
        // automatically navigate this window directly to the Studio after 600ms so it never hangs!
        setTimeout(function() {
          if (!window.closed) {
            window.location.replace(targetUrl);
          }
        }, 600);
      } else {
        setTimeout(function() {
          window.location.replace(targetUrl);
        }, 250);
      }
    })();
  </script>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );

    // Also set a readable cookie with the payload so even if popup & parent are isolated, the Studio page picks it up
    response.cookies.set('ezlive_fb_session', JSON.stringify(payload), {
      httpOnly: false,
      secure: proto === 'https',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 60, // 60 days
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to authenticate with Facebook';
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Authentication Error</title></head>
<body style="background:#080605;color:#f87171;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
  <div style="background:#140e0c;border:1px solid #7f1d1d;border-radius:16px;padding:32px;max-width:440px;">
    <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
    <h3 style="margin:0 0 8px 0;color:#fca5a5;">OAuth Error</h3>
    <p style="color:#a8a29e;font-size:13px;line-height:1.5;">${escapeHtml(errorMsg)}</p>
    <a href=${JSON.stringify(returnTo)} onclick="try{window.close();}catch(e){}" style="display:inline-block;text-decoration:none;margin-top:20px;padding:10px 24px;background:#e8430a;color:#ffffff;border-radius:10px;font-size:13px;font-weight:bold;cursor:pointer;">Return to EZLive Studio</a>
  </div>
  <script>
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'FB_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
      } catch (e) {}
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
