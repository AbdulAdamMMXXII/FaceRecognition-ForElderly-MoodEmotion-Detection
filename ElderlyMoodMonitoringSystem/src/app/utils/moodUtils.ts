import type { EmotionType } from '../types';

// color mapping for emotions
export const getMoodColor = (emotion: EmotionType | string): string => {
  const colors: Record<string, string> = {
    happy: '#10b981', // green
    sad: '#3b82f6', // blue
    neutral: '#6b7280', // gray
    stressed: '#f59e0b', // amber
    anxious: '#ef4444', // red
    confused: '#8b5cf6' // purple
  };
  return colors[emotion] || '#6b7280';
};

// emoji mapping for emotions
export const getMoodEmoji = (emotion: EmotionType | string): string => {
  const emojis: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    neutral: '😐',
    stressed: '😰',
    anxious: '😟',
    confused: '😕'
  };
  return emojis[emotion] || '😐';
};

// map face-api expression key to our EmotionType
export const mapExpressionToEmotion = (expr: string): EmotionType => {
  switch (expr) {
    case 'happy':
      return 'happy';
    case 'sad':
      return 'sad';
    case 'neutral':
      return 'neutral';
    case 'angry':
      return 'stressed';
    case 'fearful':
      return 'anxious';
    case 'disgusted':
      return 'confused';
    case 'surprised':
      return 'confused';
    default:
      return 'neutral';
  }
};
