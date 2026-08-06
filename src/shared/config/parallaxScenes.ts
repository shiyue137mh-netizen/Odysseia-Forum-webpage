import back1 from '@/assets/parallax/back1.png';
import back2 from '@/assets/parallax/back2.png';
import back3 from '@/assets/parallax/back3.png';
import back4 from '@/assets/parallax/back4.png';
import front1 from '@/assets/parallax/front1.png';
import front2 from '@/assets/parallax/front2.png';
import front3 from '@/assets/parallax/front3.png';
import front4 from '@/assets/parallax/front4.png';

export const parallaxScenes = [
  { background: back1, foreground: front1, foregroundFit: 'contain' },
  { background: back2, foreground: front2, foregroundFit: 'cover' },
  { background: back3, foreground: front3, foregroundFit: 'cover' },
  { background: back4, foreground: front4, foregroundFit: 'cover' },
] as const;
