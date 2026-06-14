import { create } from 'zustand';
import type { SlideData } from '@/components/SildeShow'
import type { Post } from '@/types';
import { fetchPosts, fetchTags } from '@/api/posts';

interface TagItem{
    id: string;
    name: string;
}

interface HomeState{
    banners:SlideData[];
    posts:Post[];
    hasMore:boolean;
    loading:boolean;
    page:number;
    tags:TagItem[];
    currentTag: string | null;
    loadMore: (tag?: string)=>Promise<void>;
    loadTags: ()=>Promise<void>;
}

export const useHomeStore = create<HomeState>((set,get)=>({
    banners:[{
      id: 1,
      title: "《原神》5.0版本前瞻：纳塔地区全新探索",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: 2,
      title: "《黑神话：悟空》深度评测",
      image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=2165&auto=format&fit=crop",
    },
    {
      id: 3,
      title: "Steam夏季特卖：20款史低游戏推荐",
      image: "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?q=80&w=2070&auto=format&fit=crop",
  }],
  posts:[],
  page:1,
  hasMore:true,
  loading:false,
  tags:[],
  currentTag:null,
  loadTags: async ()=>{
    try{
      const tags = await fetchTags();
      set({ tags: tags.data || [] });
    }catch(error){
      console.error('加载标签失败',error);
    }
  },
  loadMore: async (tag?: string)=>{
    if(get().loading || !get().hasMore) return;
    // 如果传入了新的 tag，重置分页
    const currentTag = tag !== undefined ? tag : get().currentTag;
    const isNewTag = tag !== undefined && tag !== get().currentTag;
    if(isNewTag){
      set({loading:true, posts:[], page:1, hasMore:true, currentTag: tag});
      try{
        const {items} = await fetchPosts(1, 10, tag);
        if(items.length === 0){
          set({hasMore:false});
        }else{
          set({posts:items, page:2, hasMore:items.length >= 10});
        }
      }catch(error){
        console.error('加载失败',error);
      }finally{
        set({loading:false});
      }
      return;
    }
    set({loading:true});
    try{
      const {items} = await fetchPosts(get().page, 10, currentTag || undefined);
      if(items.length === 0){
        set({hasMore:false});
      }else{
        set({
          posts:[...get().posts,...items],
          page:get().page+1,
        })
      }
    }catch(error){
      console.error('加载失败',error);
    }finally{
      set({loading:false});
    }
  }
}))

