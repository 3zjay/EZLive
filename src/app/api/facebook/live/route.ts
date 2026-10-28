import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      targetType = 'page', // 'page' | 'group' | 'timeline'
      targetId,
      pageId,
      groupId,
      pageAccessToken,
      userAccessToken,
      title,
      description,
      liveVideoId,
    } = body;

    // 1. Fetch user's managed Facebook Pages
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

    // 2. Fetch user's Facebook Groups (where user is admin/member)
    if (action === 'get_groups') {
      if (!userAccessToken) {
        return NextResponse.json({ error: 'Missing userAccessToken' }, { status: 400 });
      }

      const res = await fetch(
        `https://graph.facebook.com/v21.0/me/groups?access_token=${encodeURIComponent(userAccessToken)}&fields=id,name,picture,administrator,privacy`
      );
      const data = await res.json();

      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      return NextResponse.json({ groups: data.data || [] });
    }

    // 3. Create Live Broadcast (Pages, Groups, or Timeline - Streamlabs standard)
    if (action === 'create_live') {
      let endpointId = targetId || pageId || groupId;
      let token = pageAccessToken || userAccessToken;

      if (targetType === 'timeline') {
        endpointId = 'me';
        token = userAccessToken;
      } else if (targetType === 'group') {
        endpointId = groupId || targetId;
        token = userAccessToken; // Groups use userAccessToken
      } else {
        // Page
        endpointId = pageId || targetId;
        token = pageAccessToken || userAccessToken;
      }

      if (endpointId === 'page-hoopculture' || !endpointId || !token) {
        return NextResponse.json(
          { error: 'Invalid destination selected. Please select a valid Facebook Page or Group in Settings.' },
          { status: 400 }
        );
      }

      const params = new URLSearchParams({
        access_token: token,
        title: title || 'Hoop Culture Live Broadcast',
        description: description || 'Streamed live via EZLive Broadcast Studio',
        status: 'LIVE_NOW',
        stream_type: 'REGULAR',
      });

      const res = await fetch(`https://graph.facebook.com/v21.0/${endpointId}/live_videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();

      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      // Extract raw stream key from secure_stream_url
      // secure_stream_url format: rtmps://live-api-s.facebook.com:443/rtmp/{STREAM_KEY}
      let streamKey = '';
      if (data.secure_stream_url) {
        const lastSlash = data.secure_stream_url.lastIndexOf('/');
        if (lastSlash !== -1) {
          streamKey = data.secure_stream_url.slice(lastSlash + 1);
        }
      }

      return NextResponse.json({
        id: data.id,
        stream_url: data.stream_url,
        secure_stream_url: data.secure_stream_url,
        stream_key: streamKey,
        permalink_url: data.permalink_url || `https://www.facebook.com/${data.id}`,
        status: data.status,
      });
    }

    // 4. End the live video
    if (action === 'end_live') {
      const token = pageAccessToken || userAccessToken;
      if (!liveVideoId || !token) {
        return NextResponse.json({ error: 'Missing liveVideoId or access token' }, { status: 400 });
      }

      const params = new URLSearchParams({
        access_token: token,
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
