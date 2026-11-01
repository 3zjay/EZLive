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

    // ACTION 1B: Streamlabs-style Profile Connect — Fetch Channel + Reusable Stream Key
    if (action === 'connect_profile') {
      // 1. Fetch YouTube Channel Info
      let channelInfo = {
        id: '',
        title: 'YouTube Live Channel',
        avatar: '',
        subscriberCount: '0',
      };

      try {
        const chRes = await fetch(
          `${YT_API_BASE}/channels?part=snippet,statistics,status&mine=true`,
          { headers: authHeaders }
        );
        const chData = await chRes.json();
        const chItem = chData.items?.[0];
        if (chItem) {
          channelInfo = {
            id: chItem.id || '',
            title: chItem.snippet?.title || 'YouTube Channel',
            avatar: chItem.snippet?.thumbnails?.default?.url || '',
            subscriberCount: chItem.statistics?.subscriberCount || '0',
          };
        }
      } catch {}

      // 2. Check for existing reusable YouTube liveStreams on the user's channel
      let streamKey = '';
      let rtmpUrl = 'rtmp://a.rtmp.youtube.com/live2';
      let streamId = '';
      let warningMessage = '';

      try {
        const listRes = await fetch(
          `${YT_API_BASE}/liveStreams?part=snippet,cdn,contentDetails&mine=true&maxResults=10`,
          { headers: authHeaders }
        );
        const listData = await listRes.json();

        if (listData.error) {
          warningMessage =
            listData.error.message ||
            'YouTube Live Streaming is not enabled on this channel yet (enable it once in studio.youtube.com).';
        } else if (Array.isArray(listData.items) && listData.items.length > 0) {
          // Pick the first reusable stream (or first available stream)
          const reusable =
            listData.items.find(
              (item: { contentDetails?: { isReusable?: boolean }; cdn?: { ingestionInfo?: { streamName?: string } } }) =>
                item.contentDetails?.isReusable && item.cdn?.ingestionInfo?.streamName
            ) || listData.items[0];
          const ingestion = reusable?.cdn?.ingestionInfo || {};
          if (ingestion.streamName) {
            streamKey = ingestion.streamName;
            rtmpUrl = ingestion.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2';
            streamId = reusable.id || '';
          }
        }

        // 3. If no existing stream was found and no error, create a persistent reusable liveStream
        if (!streamKey && !warningMessage) {
          const createStreamRes = await fetch(
            `${YT_API_BASE}/liveStreams?part=snippet,cdn,contentDetails`,
            {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                snippet: {
                  title: 'EZLiveStudio by HoopCulture — Reusable 1080p60 Key',
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
          const createStreamData = await createStreamRes.json();
          if (createStreamData.error) {
            warningMessage = createStreamData.error.message || 'Could not auto-create YouTube stream key.';
          } else {
            const ingestion = createStreamData.cdn?.ingestionInfo || {};
            streamKey = ingestion.streamName || '';
            rtmpUrl = ingestion.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2';
            streamId = createStreamData.id || '';
          }
        }
      } catch (e: unknown) {
        warningMessage = e instanceof Error ? e.message : 'Failed to query YouTube liveStreams';
      }

      return NextResponse.json({
        channel: channelInfo,
        streamId,
        streamKey,
        rtmpUrl,
        warning: warningMessage || undefined,
      });
    }

    // ACTION 2: Create a YouTube Live Broadcast + Stream and bind them (OBS / Streamlabs Auto-Connect)
    if (action === 'create_live') {
      // First fetch channel title/avatar so UI shows the exact YouTube channel name
      let channelTitle = '';
      let channelAvatar = '';
      let channelId = '';
      try {
        const chRes = await fetch(`${YT_API_BASE}/channels?part=snippet&mine=true`, { headers: authHeaders });
        const chData = await chRes.json();
        const chItem = chData.items?.[0];
        if (chItem) {
          channelId = chItem.id || '';
          channelTitle = chItem.snippet?.title || '';
          channelAvatar = chItem.snippet?.thumbnails?.default?.url || '';
        }
      } catch {}

      // Check if user already has a reusable liveStream so we don't spam duplicate stream keys
      let existingStreamId = '';
      let existingStreamKey = '';
      let existingRtmpUrl = 'rtmp://a.rtmp.youtube.com/live2';

      try {
        const listRes = await fetch(
          `${YT_API_BASE}/liveStreams?part=snippet,cdn,contentDetails&mine=true&maxResults=10`,
          { headers: authHeaders }
        );
        const listData = await listRes.json();
        if (Array.isArray(listData.items) && listData.items.length > 0) {
          const found =
            listData.items.find(
              (s: { contentDetails?: { isReusable?: boolean }; cdn?: { ingestionInfo?: { streamName?: string } } }) =>
                s.contentDetails?.isReusable && s.cdn?.ingestionInfo?.streamName
            ) || listData.items[0];
          if (found?.cdn?.ingestionInfo?.streamName) {
            existingStreamId = found.id;
            existingStreamKey = found.cdn.ingestionInfo.streamName;
            existingRtmpUrl = found.cdn.ingestionInfo.ingestionAddress || existingRtmpUrl;
          }
        }
      } catch {}

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
        // Even if broadcast creation failed (e.g. account still in 24hr activation or using default stream),
        // if we found an existing reusable stream key, return it so the user is still connected!
        if (existingStreamKey) {
          return NextResponse.json({
            streamId: existingStreamId,
            rtmpUrl: existingRtmpUrl,
            streamKey: existingStreamKey,
            channelId,
            channelTitle,
            channelAvatar,
            status: 'READY',
          });
        }
        return NextResponse.json(
          {
            error:
              broadcastData.error.message ||
              'Failed to create YouTube liveBroadcast. Ensure YouTube Live Streaming is enabled on your channel at studio.youtube.com.',
            channelTitle,
          },
          { status: 400 }
        );
      }

      const createdBroadcastId = broadcastData.id;
      const createdLiveChatId = broadcastData.snippet?.liveChatId || '';

      let createdStreamId = existingStreamId;
      let rtmpUrl = existingRtmpUrl;
      let streamKey = existingStreamKey;

      // Step 2B: Create liveStream (1080p 60fps RTMP ingestion) if none existed yet
      if (!createdStreamId || !streamKey) {
        const streamRes = await fetch(
          `${YT_API_BASE}/liveStreams?part=snippet,cdn,contentDetails`,
          {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              snippet: {
                title: `EZLiveStudio Reusable Stream Key`,
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

        createdStreamId = streamData.id;
        const ingestionInfo = streamData.cdn?.ingestionInfo || {};
        rtmpUrl = ingestionInfo.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2';
        streamKey = ingestionInfo.streamName || '';
      }

      // Step 2C: Bind liveBroadcast to liveStream
      await fetch(
        `${YT_API_BASE}/liveBroadcasts/bind?id=${encodeURIComponent(createdBroadcastId)}&part=id,contentDetails&streamId=${encodeURIComponent(createdStreamId)}`,
        {
          method: 'POST',
          headers: authHeaders,
        }
      ).catch(() => {});

      return NextResponse.json({
        broadcastId: createdBroadcastId,
        streamId: createdStreamId,
        rtmpUrl,
        streamKey,
        channelId,
        channelTitle,
        channelAvatar,
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
