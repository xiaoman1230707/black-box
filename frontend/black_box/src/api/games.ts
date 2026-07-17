import instance from './config';
import type { Game } from '@/types';

// 二期:发帖选游戏(拦截器已解包,直接返回数组)
export const fetchGames = async (): Promise<Game[]> => {
  try {
    return await instance.get('/games');
  } catch (err) {
    console.error('Failed to fetch games:', err);
    return [];
  }
};
