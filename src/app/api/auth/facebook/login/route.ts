import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customAppId = searchParams.get('app_id');

  const appId =
    customAppId ||
    process.env.FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  if (!appId) {
    return NextResponse.json(
      {
        error:
          'Missing Facebook App ID. Please set FACEBOOK_APP_ID in environment variables or configure it in Studio Settings.',
      },
      { status: 400 }
    );
  }

  // Derive redirect URI dynamically based on current host (supports localhost & Vercel production)
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = `${proto}://${host}/api/auth/facebook/callback`;

  // CSRF protection state
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const scopes = [
    'email',
    'public_profile',
    'publish_video',
    'pages_show_list',
    'pages_manage_posts',
    'pages_read_engagement',
  ].join(',');

  const fbAuthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  fbAuthUrl.searchParams.set('client_id', appId);
  fbAuthUrl.searchParams.set('redirect_uri', redirectUri);
  fbAuthUrl.searchParams.set('state', state);
  fbAuthUrl.searchParams.set('scope', scopes);
  fbAuthUrl.searchParams.set('response_type', 'code');

  const response = NextResponse.redirect(fbAuthUrl.toString());

  // Store state and optional customAppId in secure cookies for callback validation
  response.cookies.set('fb_oauth_state', state, {
    httpOnly: true,
    secure: proto === 'https',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  if (customAppId) {
    response.cookies.set('fb_custom_app_id', customAppId, {
      httpOnly: true,
      secure: proto === 'https',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
  }

  return response;
}
