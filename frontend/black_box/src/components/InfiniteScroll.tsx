import {
  useRef,
  useEffect,
} from 'react';
interface InfiniteScrollProps{
    hasMore:boolean;// 是否所有数据都加载了 分页到最后一页变为false
    isLoading?:boolean;// 滚动到底部开始加载更多，避免重复触发
    onLoadMore:()=>void;// 加载更多数据的回调函数 /api/posts?page=2&limit=10
    children?:React.ReactNode; // InfiniteScroll 通用的滚动功能，滚动的内容可接受定制的传递的
}

const InfiniteScroll:React.FC<InfiniteScrollProps> = ({
    hasMore,
    isLoading = false,
    onLoadMore,
    children,
})=> {
  // HTMLDivElement React 前端全局引用
  // react不建议直接访问dom，而是通过ref来操作dom
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    // dom 挂载在页面后，才能获取到dom元素 sentinelRef.current
    if(!hasMore || isLoading) return;// 没有数据 或者 还在加载
    const observer = new IntersectionObserver(entries=>{ //entries 被监听的实体
      if(entries[0].isIntersecting){ // 进入视窗 viewport
        onLoadMore();
      }
    },{
      threshold:0.0,// 元素进入视窗的比例 1.0 表示完全进入视窗 0.0 表示任何位置进入都触发
    })   
    if(sentinelRef.current)
    observer.observe(sentinelRef.current);// 监听哨兵元素
    // 卸载时，取消监听
    return ()=>{
      observer.disconnect();
    }
  },[onLoadMore,hasMore,isLoading])
  return (
    <div>
      {children}
      {/* Intersection Observer 监听的哨兵元素 */}
      <div ref={sentinelRef}/>
      {
        isLoading &&(
          <div className="text-center py-4 text-sm text-muted-foreground">
            加载中...
          </div>
        )
      }
    </div>
  )
}

export default InfiniteScroll;