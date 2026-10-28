export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  pictureUrl?: string;
}

export interface FacebookLiveVideoResponse {
  id: string;
  stream_url: string;
  secure_stream_url: string;
  status: 'UNPUBLISHED' | 'LIVE_NOW' | 'PROCESSING' | 'VOD';
  title?: string;
  description?: string;
}

export interface FacebookAuthSession {
  accessToken: string;
  userId: string;
  name: string;
  pages: FacebookPage[];
  selectedPageId: string | null;
}
