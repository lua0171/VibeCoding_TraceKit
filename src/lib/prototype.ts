export interface Hotspot {
  id: string;
  name: string;
  x: number; // normalized left (0 to 1)
  y: number; // normalized top (0 to 1)
  width: number; // normalized width (0 to 1)
  height: number; // normalized height (0 to 1)
  targetFrameId: string;
}

export interface PrototypeFrame {
  id: string;
  name: string;
  layoutType: 'home' | 'dashboard' | 'search' | 'profile';
  hotspots: Hotspot[];
}

export const MOCK_PROTOTYPE_FRAMES: PrototypeFrame[] = [
  {
    id: 'Home View',
    name: 'Home View',
    layoutType: 'home',
    hotspots: [
      {
        id: 'hs-login',
        name: 'Login Button',
        x: 0.4,
        y: 0.52,
        width: 0.2,
        height: 0.07,
        targetFrameId: 'Dashboard View'
      }
    ]
  },
  {
    id: 'Dashboard View',
    name: 'Dashboard View',
    layoutType: 'dashboard',
    hotspots: [
      {
        id: 'hs-dash-search',
        name: 'Search Navigation Item',
        x: 0.38,
        y: 0.02,
        width: 0.08,
        height: 0.05,
        targetFrameId: 'Search View'
      },
      {
        id: 'hs-dash-profile',
        name: 'Profile Nav Circle',
        x: 0.88,
        y: 0.015,
        width: 0.05,
        height: 0.06,
        targetFrameId: 'Profile View'
      },
      {
        id: 'hs-dash-logout',
        name: 'Sign Out Link',
        x: 0.02,
        y: 0.92,
        width: 0.1,
        height: 0.05,
        targetFrameId: 'Home View'
      }
    ]
  },
  {
    id: 'Search View',
    name: 'Search View',
    layoutType: 'search',
    hotspots: [
      {
        id: 'hs-search-dash',
        name: 'Dashboard Breadcrumb Link',
        x: 0.08,
        y: 0.02,
        width: 0.12,
        height: 0.05,
        targetFrameId: 'Dashboard View'
      },
      {
        id: 'hs-search-item1',
        name: 'First Search Product Card',
        x: 0.08,
        y: 0.26,
        width: 0.26,
        height: 0.3,
        targetFrameId: 'Profile View'
      }
    ]
  },
  {
    id: 'Profile View',
    name: 'Profile View',
    layoutType: 'profile',
    hotspots: [
      {
        id: 'hs-profile-back',
        name: 'Back Navigation Arrow',
        x: 0.03,
        y: 0.03,
        width: 0.1,
        height: 0.06,
        targetFrameId: 'Dashboard View'
      },
      {
        id: 'hs-profile-logout',
        name: 'Account Logout Button',
        x: 0.42,
        y: 0.72,
        width: 0.16,
        height: 0.06,
        targetFrameId: 'Home View'
      }
    ]
  }
];

export const getPrototypeData = (_url?: string): { frames: PrototypeFrame[] } => {
  // Can be extended to parse URL searchParams or mock customized files
  return { frames: MOCK_PROTOTYPE_FRAMES };
};
