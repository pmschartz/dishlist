// Dishlist's own line icons (ported from the design system's components/bundle.js):
// 24px grid, 2px stroke, round caps and joins, drawn in currentColor.
export const ICONS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  search: 'M11 4.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13zM16 16l4.5 4.5',
  plate: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 7.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z',
  utensils: 'M6 3v6a3 3 0 0 0 6 0V3M9 3v18M18 21V3c-2.2 1.6-3.5 4.3-3.5 7.5V14H18',
  swap: 'M5 8h13l-3.5-3.5M19 16H6l3.5 3.5',
  bowl: 'M4 11h16a8 8 0 0 1-16 0zM9.5 7.5c0-1.2 1-1.6 1-2.8M14 7.5c0-1.2 1-1.6 1-2.8',
  flame:
    'M12 21a6 6 0 0 0 6-6c0-4.2-3.2-6.4-4.2-10.5-2.1 1.8-3.3 4.2-3.3 6.3-.9-.8-1.5-1.9-1.6-3.1C7.3 10.3 6 12.6 6 15a6 6 0 0 0 6 6z',
  'map-pin': 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 7.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
  camera: 'M4 8h3.5l2-3h5l2 3H20v11H4zM12 10a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z',
  note: 'M5 4h10l4 4v12H5zM15 4v4h4M9 12h6M9 16h4',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
  bookmark: 'M7 4h10v16l-5-3.5L7 20z',
  clock: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 7.5V12l3 2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  user: 'M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM4.5 20a7.5 7.5 0 0 1 15 0',
  trash: 'M4 7h16M10 7V4h4v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  info: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 11v5M12 7.5h.01',
  alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  repeat: 'M4.5 11a7.5 7.5 0 0 1 13.4-4.6M19 3.5v4h-4M19.5 13a7.5 7.5 0 0 1-13.4 4.6M5 20.5v-4h4',
  question:
    'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.5M12 16.8h.01',
  skip: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM5.6 5.6l12.8 12.8',
  share: 'M12 4v11M8 8l4-4 4 4M5 13v7h14v-7',
  sparkle: 'M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z',
} as const;

export type IconName = keyof typeof ICONS;
