import { NextRequest, NextResponse } from 'next/server';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      accessToken,
      title,
      description,
      privacyStatus = 'public',
      latencyPreference = 'ultraLow',
      broadcastId,
      liveChatId,
    } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing Google/YouTube OAuth accessToken' },
        { status: 400 }
      );
    }

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // ACTION 1: Fetch authenticated user's YouTube channel info
    if (action === 'get_channel') {
      const res = await fetch(
        `${YT_API_BASE}/channels?part=snippet,statistics,status&mine=true`,
        { headers: authHeaders }
      );
      const data = await res.json();

      if (data.error) {
        return NextResponse.json(
          { error: data.error.message || 'Failed to fetch YouTube channel' },
          { status: 400 }
        );
      }

      const item = data.items?.[0];
      if (!item) {
        return NextResponse.json(
          { error: 'No YouTube channel found for this Google account.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        channel: {
          id: item.id,
          title: item.snippet?.title || 'YouTube Channel',
          avatar: item.snippet?.thumbnails?.default?.url || '',
          subscriberCount: item.statistics?.subscriberCount || '0',
        },
      });
    }

    // ACTION 2: Create a YouTube Live Broadcast + Stream and bind them (OBS / Streamlabs Auto-Connect)
    if (action === 'create_live') {
      const scheduledStartTime = new Date().toISOString();

      // Step 2A: Create liveBroadcast
      const broadcastRes = await fetch(
        `${YT_API_BASE}/liveBroadcasts?part=snippet,status,contentDetails`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            snippet: {
              title: title || 'Hoop Culture Live Basketball Broadcast',
              description:
                description ||
                'Streaming live in 1080p60 via EZLiveStudio by HoopCulture (live.hoopculture.ca)',
              scheduledStartTime,
            },
            status: {
              privacyStatus,
              selfDeclaredMadeForKids: false,
            },
            contentDetails: {
              enableAutoStart: true,
              enableAutoStop: true,
              latencyPreference,
              enableDvr: true,
              recordFromStart: true,
            },
          }),
        }
      );

      const broadcastData = await broadcastRes.json();
      if (broadcastData.error) {
        return NextResponse.json(
          {
            error:
              broadcastData.error.message ||
              'Failed to create YouTube liveBroadcast. Ensure YouTube Live Streaming is enabled on your channel.',
          },
          { status: 400 }
        );
      }

      const createdBroadcastId = broadcastData.id;
      const createdLiveChatId = broadcastData.snippet?.liveChatId || '';

      // Step 2B: Create liveStream (1080p 60fps RTMP ingestion)
      const streamRes = await fetch(
        `${YT_API_BASE}/liveStreams?part=snippet,cdn,contentDetails`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            snippet: {
              title: `EZLiveStudio Stream - ${new Date().toLocaleTimeString()}`,
            },
            cdn: {
              frameRate: '60fps',
              ingestionType: 'rtmp',
              resolution: '1080p',
            },
            contentDetails: {
              isReusable: true,
            },
          }),
        }
      );

      const streamData = await streamRes.json();
      if (streamData.error) {
        return NextResponse.json(
          { error: streamData.error.message || 'Failed to create YouTube liveStream' },
          { status: 400 }
        );
      }

      const createdStreamId = streamData.id;
      const ingestionInfo = streamData.cdn?.ingestionInfo || {};
      const rtmpUrl = ingestionInfo.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2';
      const streamKey = ingestionInfo.streamName || '';

      // Step 2C: Bind liveBroadcast to liveStream
      const bindRes = await fetch(
        `${YT_API_BASE}/liveBroadcasts/bind?id=${encodeURIComponent(createdBroadcastId)}&part=id,contentDetails&streamId=${encodeURIComponent(createdStreamId)}`,
        {
          method: 'POST',
          headers: authHeaders,
        }
      );
      const bindData = await bindRes.json();
      if (bindData.error) {
        return NextResponse.json(
          { error: bindData.error.message || 'Failed to bind YouTube broadcast to stream' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        broadcastId: createdBroadcastId,
        streamId: createdStreamId,
        rtmpUrl,
        streamKey,
        liveChatId: createdLiveChatId,
        watchUrl: `https://www.youtube.com/live/${createdBroadcastId}`,
        status: 'READY',
      });
    }

    // ACTION 3: End YouTube Live Broadcast
    if (action === 'end_live') {
      if (!broadcastId) {
        return NextResponse.json({ error: 'Missing broadcastId' }, { status: 400 });
      }

      const endRes = await fetch(
        `${YT_API_BASE}/liveBroadcasts/transition?broadcastStatus=complete&id=${encodeURIComponent(broadcastId)}&part=id,status`,
        {
          method: 'POST',
          headers: authHeaders,
        }
      );
      const endData = await endRes.json();
      return NextResponse.json({ success: true, data: endData });
    }

    // ACTION 4: Fetch YouTube Live Chat Messages for Unified Studio Chat
    if (action === 'get_chat') {
      if (!liveChatId) {
        return NextResponse.json({ messages: [] });
      }

      const chatRes = await fetch(
        `${YT_API_BASE}/liveChat/messages?liveChatId=${encodeURIComponent(liveChatId)}&part=id,snippet,authorDetails`,
        { headers: authHeaders }
      );
      const chatData = await chatRes.json();

      if (chatData.error || !Array.isArray(chatData.items)) {
        return NextResponse.json({ messages: [] });
      }

      const messages = chatData.items.map(
        (item: {
          id: string;
          snippet?: { displayMessage?: string; publishedAt?: string };
          authorDetails?: { displayName?: string; profileImageUrl?: string };
        }) => ({
          id: item.id,
          sender: item.authorDetails?.displayName || 'YouTube Viewer',
          avatar: item.authorDetails?.profileImageUrl || undefined,
          message: item.snippet?.displayMessage || '',
          platform: 'youtube',
          timestamp: item.snippet?.publishedAt
            ? new Date(item.snippet.publishedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Live',
        })
      );

      return NextResponse.json({ messages });
    }

    return NextResponse.json({ error: 'Invalid YouTube action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
