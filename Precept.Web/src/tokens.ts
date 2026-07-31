/**
 * Centralized Design Tokens for Precept Web
 */

export const C = {
  bg0: '#02050A',
  bg1: '#06090F',
  bg2: '#0B0F17',
  bg3: '#11161F',
  ink: '#E6EBF2',
  inkDim: '#9CA8B8',
  inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)',
  hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf',
  tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  amber: '#f59e0b',
  sky: '#38bdf8',
  emerald: '#10b981',
} as const;

export type ColorTokens = typeof C;
