import { useState,useEffect } from 'react';
import {
  useNavigate,
  useSearchParams
} from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, X, Search } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchStore } from '@/store/search'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import PostItem from '@/components/PostItem'
import type { Post } from '@/types'

const SearchPage: React.FC = () => {
  const [keyword, setKeyword] = useState("");
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const debounceKeyword = useDebounce<string>(keyword, 500);
  const navigate = useNavigate();
  const {
    loading,
    suggestions,
    history,
    search,
    searchByTag,
    addHistory,
    clearHistory,
  } = useSearchStore();

  useEffect(()=>{
    if(categoryParam && categoryParam !== 'all'){
      searchByTag(categoryParam);
    }
  },[categoryParam])

  useEffect(()=>{
    if(debounceKeyword && !categoryParam){
      search(debounceKeyword);
    }
  },[debounceKeyword, categoryParam])

  const handleSearch = (keyword:string) => {
    if(keyword.trim()){
      addHistory(keyword.trim());
      search(keyword);
    }
    setKeyword(keyword);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keyword.trim()) {
      addHistory(keyword.trim());
    }
  }

  const handleResultClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  }

  return (
    <div className="p-3 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Button size="icon" variant="ghost" onClick={()=>navigate(-1)}>
          <ArrowLeft className="w-5 h-5"/>
        </Button>
        <div className="relative flex-1">
          <Input
            value={keyword}
            onChange={(e)=>setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={categoryParam ? `分类: ${categoryParam}` : "搜索游戏、攻略、评测..."}
            className="pr-9"
          />
          {
            keyword && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 p-0"
                onClick={()=>setKeyword('')}
              >
                <X className="w-5 h-5"/>
              </Button>
            )
          }
        </div>
        <Button size="icon" variant="ghost" onClick={()=>handleSearch(keyword)}>
          <Search className="w-5 h-5"/>
        </Button>
      </div>
      { !keyword && !categoryParam && history.length > 0 && (
        <Card className="mb-3">
          <CardContent className="p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">最近搜索</span>
              <Button size="sm" variant="ghost" onClick={()=>clearHistory()}>
                清空
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {
                history.map(item=>(
                  <Button
                  key={item}
                  variant="secondary"
                  size="sm"
                  onClick={()=>handleSearch(item)}
                  >
                    {item}
                  </Button>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
      {(keyword || categoryParam) && (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className='h-[60vh]'>
              {
                loading && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    搜索中...
                  </div>
                )
              }
              {!loading && suggestions.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  暂无搜索结果
                </div>
              )}
              {
                !loading && suggestions.length > 0 && suggestions[0] && 'title' in suggestions[0] ? (
                  <div className="space-y-3 p-3">
                    {suggestions.map((post)=>(
                      <div key={post.id} onClick={()=>handleResultClick(post)}>
                        <PostItem post={post} />
                      </div>
                    ))}
                  </div>
                ) : !loading && suggestions.length > 0 ? (
                  suggestions.map((item: any, index: number)=>(
                    <div
                    className="p-4 py-3 border-b text-sm active:bg-muted"
                    key={index}
                    onClick={()=>navigate('/')}
                    >
                      {item}
                    </div>
                  ))
                ) : null
              }
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SearchPage
