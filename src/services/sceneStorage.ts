import { Scene } from '@/types/broadcast';

const STORAGE_KEY = 'ezlive_scenes_v2';

export const DEFAULT_OBS_SCENES: Scene[] = [
  {
    id: 'scene-game',
    name: '1. Live Basketball Game',
    sources: [
      {
        id: 'src-cam-game',
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
        id: 'src-sb-game',
        name: 'Basketball Scoreboard HUD',
        type: 'scoreboard',
        visible: true,
        locked: false,
        x: 480,
        y: 40,
        width: 960,
        height: 120,
        opacity: 1,
        zIndex: 2,
        theme: 'hooptimes',
        scale: 1,
      },
      {
        id: 'src-sponsor-game',
        name: 'Sponsor Watermark',
        type: 'text',
        visible: true,
        locked: false,
        x: 1580,
        y: 40,
        width: 300,
        height: 50,
        opacity: 0.9,
        zIndex: 3,
        text: 'HOOP TIMES LIVE',
        fontSize: 16,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: '#f8fafc',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: 12,
        borderRadius: 8,
      },
    ],
  },
  {
    id: 'scene-custom-overlay',
    name: '2. Custom Vercel URL Overlay',
    sources: [
      {
        id: 'src-cam-overlay',
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
        id: 'src-browser-url',
        name: 'Browser Source (Vercel URL)',
        type: 'browser_url',
        visible: true,
        locked: false,
        url: '/scoreboard',
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 2,
        syncDataBridge: true,
      },
    ],
  },
  {
    id: 'scene-intro',
    name: '3. Pregame Intro',
    sources: [
      {
        id: 'src-bg-intro',
        name: 'Background Stage',
        type: 'color_solid',
        visible: true,
        locked: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 1,
        color: '#090d16',
        borderRadius: 0,
      },
      {
        id: 'src-title-intro',
        name: 'Tournament Title',
        type: 'text',
        visible: true,
        locked: false,
        x: 360,
        y: 280,
        width: 1200,
        height: 120,
        opacity: 1,
        zIndex: 2,
        text: 'HOOP TIMES BASKETBALL LEAGUE',
        fontSize: 48,
        fontFamily: 'sans-serif',
        fontWeight: '900',
        color: '#38bdf8',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: 24,
        borderRadius: 16,
      },
      {
        id: 'src-matchup-intro',
        name: 'Matchup Info',
        type: 'text',
        visible: true,
        locked: false,
        x: 460,
        y: 440,
        width: 1000,
        height: 100,
        opacity: 1,
        zIndex: 3,
        text: 'WARRIORS VS LAKERS • CHAMPIONSHIP',
        fontSize: 34,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        padding: 20,
        borderRadius: 12,
      },
      {
        id: 'src-tag-intro',
        name: 'Status Subtitle',
        type: 'text',
        visible: true,
        locked: false,
        x: 610,
        y: 600,
        width: 700,
        height: 60,
        opacity: 1,
        zIndex: 4,
        text: 'BROADCAST STARTING IN MOMENTS',
        fontSize: 22,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: '#fbbf24',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        padding: 14,
        borderRadius: 8,
      },
    ],
  },
  {
    id: 'scene-interview',
    name: '4. Sideline Interview',
    sources: [
      {
        id: 'src-cam-interview',
        name: 'Interview Camera',
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
        id: 'src-lowerthird-bg',
        name: 'Lower Third Background',
        type: 'color_solid',
        visible: true,
        locked: false,
        x: 80,
        y: 860,
        width: 860,
        height: 130,
        opacity: 0.95,
        zIndex: 2,
        color: '#0f172a',
        borderRadius: 16,
      },
      {
        id: 'src-lowerthird-name',
        name: 'Speaker Name',
        type: 'text',
        visible: true,
        locked: false,
        x: 120,
        y: 885,
        width: 600,
        height: 48,
        opacity: 1,
        zIndex: 3,
        text: 'COACH MARCUS STERLING',
        fontSize: 32,
        fontFamily: 'sans-serif',
        fontWeight: '900',
        color: '#ffffff',
        backgroundColor: 'transparent',
        padding: 0,
        borderRadius: 0,
      },
      {
        id: 'src-lowerthird-role',
        name: 'Speaker Role',
        type: 'text',
        visible: true,
        locked: false,
        x: 120,
        y: 935,
        width: 600,
        height: 36,
        opacity: 1,
        zIndex: 4,
        text: 'Head Coach • Northside Ballers',
        fontSize: 20,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: '#38bdf8',
        backgroundColor: 'transparent',
        padding: 0,
        borderRadius: 0,
      },
    ],
  },
  {
    id: 'scene-halftime',
    name: '5. Halftime Intermission',
    sources: [
      {
        id: 'src-bg-halftime',
        name: 'Stage Background',
        type: 'color_solid',
        visible: true,
        locked: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        zIndex: 1,
        color: '#0f172a',
        borderRadius: 0,
      },
      {
        id: 'src-title-halftime',
        name: 'Halftime Banner',
        type: 'text',
        visible: true,
        locked: false,
        x: 560,
        y: 120,
        width: 800,
        height: 80,
        opacity: 1,
        zIndex: 2,
        text: 'HALFTIME BREAK',
        fontSize: 42,
        fontFamily: 'sans-serif',
        fontWeight: '900',
        color: '#f59e0b',
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        padding: 16,
        borderRadius: 12,
      },
      {
        id: 'src-sb-halftime',
        name: 'Scoreboard Summary',
        type: 'scoreboard',
        visible: true,
        locked: false,
        x: 480,
        y: 340,
        width: 960,
        height: 120,
        opacity: 1,
        zIndex: 3,
        theme: 'hooptimes',
        scale: 1.1,
      },
      {
        id: 'src-notice-halftime',
        name: 'Halftime Notice',
        type: 'text',
        visible: true,
        locked: false,
        x: 510,
        y: 620,
        width: 900,
        height: 60,
        opacity: 1,
        zIndex: 4,
        text: 'SECOND HALF WILL RESUME SHORTLY',
        fontSize: 24,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: '#22c55e',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 14,
        borderRadius: 8,
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
        if (Array.isArray(parsed) && parsed.length > 0) {
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
    return JSON.stringify(
      {
        name: 'EZ-Live-Scene-Collection',
        version: 2,
        exportedAt: new Date().toISOString(),
        scenes,
      },
      null,
      2
    );
  }

  public static importSceneCollection(jsonString: string): Scene[] | null {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        return parsed.scenes;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Invalid scene collection JSON:', e);
    }
    return null;
  }

  public static resetToDefaults(): Scene[] {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    return DEFAULT_OBS_SCENES;
  }
}
