import { create } from 'zustand';
import type { SlideData } from '@/components/SildeShow'
import type { Post, Game } from '@/types';
import { fetchPosts, fetchTags } from '@/api/posts';
import { fetchGames } from '@/api/games';

interface TagItem{
    id: number;  // 对齐后端 tag.id(number);原 string 靠 tags.data 的 any 绕过、已随取值修复订正
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
    games: Game[];                 // 三期§六:游戏列表(筛选 chip 行)
    currentGameId: number | null;  // 三期§六:当前选中游戏(与 currentTag 并行,AND 叠加)
    loadMore: (patch?: { tag?: string; gameId?: number | null })=>Promise<void>;
    loadTags: ()=>Promise<void>;
    loadGames: ()=>Promise<void>;
    patchPost: (id:number, patch: Partial<Pick<Post,'totalLikes'|'totalComments'|'likedByMe'>>)=>void;
    prependPost: (post: Post)=>void;
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
  games:[],
  currentGameId:null,
  loadTags: async ()=>{
    try{
      const tags = await fetchTags();
      // 拦截器已解包,fetchTags 直接返回数组本身(原 tags.data 恒 undefined,致标签栏空)
      set({ tags: tags || [] });
    }catch(error){
      console.error('加载标签失败',error);
    }
  },
  // 三期§六:加载游戏列表(供筛选 chip 行;拦截器已解包,直接是数组)
  loadGames: async ()=>{
    try{
      const games = await fetchGames();
      set({ games: games || [] });
    }catch(error){
      console.error('加载游戏失败',error);
    }
  },
  // 三期§六:复合筛选 loadMore —— tag 与 gameId 两维度并行(AND 叠加)。
  //   传 patch({tag?/gameId?})且改变任一维度 = 切换(重置分页);无 patch(InfiniteScroll)= 加载更多。
  //   二期那两个「切换」坑(!hasMore 守卫误拦切换、竞态)不是 tag 特有 → 在此扩到 game 维度:
  //   switch 路径绕 hasMore 守卫;竞态比对 **tag 与 gameId 都没变** 才采用响应。
  loadMore: async (patch)=>{
    const curTag = get().currentTag;
    const curGameId = get().currentGameId;
    // patch 未给某维度则沿用当前值(无 patch = 两维度都沿用 = 加载更多)
    const nextTag = patch && patch.tag !== undefined ? patch.tag : curTag;
    const nextGameId = patch && patch.gameId !== undefined ? patch.gameId : curGameId;
    const isSwitch = patch !== undefined && (nextTag !== curTag || nextGameId !== curGameId);

    if(isSwitch){
      // 切换筛选:重置分页拉新,**不受 hasMore 守卫限制**(二期根因:!hasMore early-return 误拦切换)。
      // 不加 loading 守卫 —— 让快速连切能打断、不卡死。
      set({loading:true, posts:[], page:1, hasMore:true, currentTag: nextTag, currentGameId: nextGameId});
      try{
        const {items} = await fetchPosts(1, 10, nextTag || undefined, nextGameId || undefined);
        // 竞态防护(双维度):响应回来时若已切到别的 tag 或 game,丢弃本次响应(防 A 响应覆盖 B)
        if(get().currentTag !== nextTag || get().currentGameId !== nextGameId) return;
        if(items.length === 0){
          set({hasMore:false});
        }else{
          set({posts:items, page:2, hasMore:items.length >= 10});
        }
      }catch(error){
        console.error('加载失败',error);
      }finally{
        // 仅当仍是本次筛选才复位 loading,避免覆盖后续切换设的 loading 态
        if(get().currentTag === nextTag && get().currentGameId === nextGameId) set({loading:false});
      }
      return;
    }
    // 加载更多(同筛选下一页):**保留守卫**(防重复拉 / 无下一页还拉)
    if(get().loading || !get().hasMore) return;
    const tagAtRequest = get().currentTag;     // 记发起时筛选,用于竞态比对
    const gameAtRequest = get().currentGameId;
    set({loading:true});
    try{
      const {items} = await fetchPosts(get().page, 10, tagAtRequest || undefined, gameAtRequest || undefined);
      // 竞态防护(双维度):加载更多期间若切了 tag 或 game,丢弃(避免旧筛选的页 append 到新列表)
      if(get().currentTag !== tagAtRequest || get().currentGameId !== gameAtRequest) return;
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
      if(get().currentTag === tagAtRequest && get().currentGameId === gameAtRequest) set({loading:false});
    }
  },
  // 二期:详情页点赞/评论后,用接口返回的权威值直接 patch 对应帖,返回首页即新值。
  // 消除 refreshLoaded "返回时重读后端 vs 操作写入完成" 的读写并发竞态(有概率计数不更新)。
  patchPost: (id, patch) => set({
    posts: get().posts.map(p => p.id === id ? { ...p, ...patch } : p)
  }),
  // 二期:发帖成功后把新帖(详情接口拉的完整列表数据)插入列表顶部,返回首页即见;
  // 不重拉整页 → 避免"已有不重载"致新帖不出现,也避免重拉的闪烁/丢已加载多页。
  prependPost: (post) => set({ posts: [post, ...get().posts] })
}))

