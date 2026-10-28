import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, pageId, pageAccessToken, userAccessToken, title, description, liveVideoId } = body;

    // ACTION 1: Fetch user's managed Facebook Pages
    if (action === 'get_pages') {
      if (!userAccessToken) {
        return NextResponse.json({ error: 'Missing userAccessToken' }, { status: 400 });
      }

      const res = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(userAccessToken)}&fields=id,name,access_token,category,picture`
      );
      const data = await res.json();

      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      return NextResponse.json({ pages: data.data || [] });
    }

    // ACTION 2: Automatically create a Facebook Live broadcast on the Page (Streamlabs style)
    if (action === 'create_live') {
      if (!pageId || !pageAccessToken) {
        return NextResponse.json({ error: 'Missing pageId or pageAccessToken' }, { status: 400 });
      }

      const params = new URLSearchParams({
        access_token: pageAccessToken,
        title: title || 'Live Basketball Broadcast',
        description: description || 'Streamed live via EZ Web Broadcast Studio',
        status: 'LIVE_NOW',
        stream_type: 'REGULAR',
      });

      const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/live_videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();

      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      // Facebook returns:
      // id: live video ID
      // stream_url: standard RTMP URL
      // secure_stream_url: RTMPS URL containing the stream key!
      return NextResponse.json({
        id: data.id,
        stream_url: data.stream_url,
        secure_stream_url: data.secure_stream_url,
        status: data.status,
      });
    }

    // ACTION 3: End the live video
    if (action === 'end_live') {
      if (!liveVideoId || !pageAccessToken) {
        return NextResponse.json({ error: 'Missing liveVideoId or pageAccessToken' }, { status: 400 });
      }

      const params = new URLSearchParams({
        access_token: pageAccessToken,
        end_live_video: 'true',
      });

      const res = await fetch(`https://graph.facebook.com/v21.0/${liveVideoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
