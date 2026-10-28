import { Scene } from '@/types/broadcast';

const STORAGE_KEY = 'ezlive_scenes_v5';

export const DEFAULT_OBS_SCENES: Scene[] = [
  {
    id: 'scene-game-nba2',
    name: '🏀 Scorebug 2',
    sources: [
      {
        id: 'src-cam-nba2',
        name: 'Court Camera',
        type: 'camera',
        visible: true,
        locked: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 1,
        fit: 'cover',
        facingMode: 'environment',
      },
      {
        id: 'src-overlay-nba2',
        name: 'NBA Scorebug 2 Overlay',
        type: 'browser_url',
        visible: true,
        locked: true,
        url: 'https://scoreboard.hoopculture.ca/nbaoverlay2?user=isidro.pascua%40gmail.com',
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 10,
        syncDataBridge: true,
      },
    ],
  },
  {
    id: 'scene-game-fullscreen',
    name: '📺 Lower Third',
    sources: [
      {
        id: 'src-cam-fullscreen',
        name: 'Court Camera',
        type: 'camera',
        visible: true,
        locked: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 1,
        fit: 'cover',
        facingMode: 'environment',
      },
      {
        id: 'src-overlay-fullscreen',
        name: 'Fullscreen Lower Third Overlay',
        type: 'browser_url',
        visible: true,
        locked: true,
        url: 'https://scoreboard.hoopculture.ca/fullscreen?user=isidro.pascua%40gmail.com',
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 10,
        syncDataBridge: true,
      },
    ],
  },
  {
    id: 'scene-game-nbc',
    name: '⚡ NBC Pro',
    sources: [
      {
        id: 'src-cam-nbc',
        name: 'Court Camera',
        type: 'camera',
        visible: true,
        locked: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 1,
        fit: 'cover',
        facingMode: 'environment',
      },
      {
        id: 'src-overlay-nbc',
        name: 'NBC Broadcast Scorebug Overlay',
        type: 'browser_url',
        visible: true,
        locked: true,
        url: 'https://scoreboard.hoopculture.ca/nbc?user=isidro.pascua%40gmail.com',
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 10,
        syncDataBridge: true,
      },
    ],
  },
  {
    id: 'scene-game-classic',
    name: '🏆 Classic NBA',
    sources: [
      {
        id: 'src-cam-classic',
        name: 'Court Camera',
        type: 'camera',
        visible: true,
        locked: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 1,
        fit: 'cover',
        facingMode: 'environment',
      },
      {
        id: 'src-overlay-classic',
        name: 'Classic NBA Scorebug Overlay',
        type: 'browser_url',
        visible: true,
        locked: true,
        url: 'https://scoreboard.hoopculture.ca/nbaoverlay?user=isidro.pascua%40gmail.com',
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 10,
        syncDataBridge: true,
      },
    ],
  },
  {
    id: 'scene-court-only',
    name: '🎥 Court Only',
    sources: [
      {
        id: 'src-cam-court',
        name: 'Court Camera',
        type: 'camera',
        visible: true,
        locked: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 1,
        fit: 'cover',
        facingMode: 'environment',
      },
    ],
  },
];

export class SceneStorage {
  public static loadScenes(): Scene[] {
    if (typeof window === 'undefined') return DEFAULT_OBS_SCENES;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0].sources)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load scenes from localStorage:', e);
    }
    return DEFAULT_OBS_SCENES;
  }

  public static saveScenes(scenes: Scene[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
    } catch (e) {
      console.warn('Failed to save scenes to localStorage:', e);
    }
  }

  public static exportSceneCollection(scenes: Scene[]): string {
    return JSON.stringify(scenes, null, 2);
  }

  public static importSceneCollection(jsonString: string): Scene[] | null {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0].sources)) {
        this.saveScenes(parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to import scene collection JSON:', e);
    }
    return null;
  }

  public static resetToDefaultScenes(): Scene[] {
    this.saveScenes(DEFAULT_OBS_SCENES);
    return DEFAULT_OBS_SCENES;
  }
}
