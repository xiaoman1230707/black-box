import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doSearch } from '@/api/search'
import { fetchPosts } from '@/api/posts'
import type { Post } from '@/types'
import { getApiErrorMessage } from '@/lib/api-error'

interface SearchState {
  loading: boolean;
  error: string | null;
  suggestions: Post[];
  history: string[];
  search: (keyword: string) => Promise<void>;
  searchByTag: (tag: string) => Promise<void>;
  addHistory: (keyword: string) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      loading: false,
      error: null,
      suggestions: [],
      history: [],
      search: async (keyword: string)=>{
        if (!keyword.trim()) {
          set({ suggestions: [], error: null, loading: false });
          return;
        }
        set({ loading: true, error: null });
        try {
          const res = await doSearch(encodeURIComponent(keyword));
          if (res.code !== 0) {
            throw new Error('SEARCH_FAILED');
          }
          const data: Post[] = res.data || [];
          set({
            suggestions: data,
            error: null,
          })
        } catch(err) {
          console.log(err,'Search failed');
          set({ suggestions: [], error: getApiErrorMessage(err, '搜索暂时不可用，请稍后重试。') });
        }finally{
          set({ loading: false});
        }
      },
      searchByTag: async (tag: string)=>{
        set({ loading: true, error: null });
        try {
          const res = await fetchPosts(1, 20, tag);
          set({
            suggestions: res.items || [],
            error: null,
          })
        } catch(err) {
          console.log(err,'SearchByTag failed');
          set({ suggestions: [], error: getApiErrorMessage(err, '分类内容加载失败，请稍后重试。') });
        }finally{
          set({ loading: false});
        }
      },
      addHistory: (keyword:string) => {
        const trimed = keyword.trim();
        if(!trimed) return;
        const { history } = get();
        const exists = history.includes(trimed);
        let newHistory = exists ? [trimed,...history.filter(h=> h !== trimed)]
        : [trimed,...history];
        newHistory = newHistory.slice(0,10);
        set({ history: newHistory});
      },
      clearHistory: () => {
        set({ history: []});
      }
    }),
    {
      name: 'search-store',
      partialize: (state)=> ({history: state.history})
    }
  )
)
