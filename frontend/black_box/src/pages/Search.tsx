import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search as SearchIcon, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PostItem from '@/components/PostItem';
import PageState from '@/components/PageState';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchStore } from '@/store/search';

interface SearchContentProps {
  activeCategory: string | null;
  initialKeyword: string;
}

function SearchContent({ activeCategory, initialKeyword }: SearchContentProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const debouncedKeyword = useDebounce(keyword, 500);
  const skipNextDebounce = useRef<string | null>(null);
  const navigate = useNavigate();
  const {
    loading,
    error,
    suggestions,
    history,
    search,
    searchByTag,
    addHistory,
    clearHistory,
  } = useSearchStore();

  const activeKeyword = keyword.trim();
  const hasQuery = Boolean(activeCategory || activeKeyword);

  useEffect(() => {
    if (activeCategory) {
      void searchByTag(activeCategory);
      return;
    }

    if (!initialKeyword.trim()) void search('');
  }, [activeCategory, initialKeyword, search, searchByTag]);

  useEffect(() => {
    if (activeCategory) {
      skipNextDebounce.current = null;
      return;
    }
    const normalized = debouncedKeyword.trim();
    const submittedKeyword = skipNextDebounce.current;
    if (submittedKeyword !== null) {
      skipNextDebounce.current = null;
      if (submittedKeyword === normalized) return;
    }
    if (!normalized) return;
    void search(normalized);
  }, [activeCategory, debouncedKeyword, search]);

  const handleSearch = (value: string) => {
    const normalized = value.trim();
    setKeyword(normalized);
    if (!normalized) {
      skipNextDebounce.current = null;
      void search('');
      return;
    }

    skipNextDebounce.current = normalized;
    addHistory(normalized);
    void search(normalized);
  };

  const handleClear = () => {
    skipNextDebounce.current = null;
    setKeyword('');
    void search('');
  };

  const retrySearch = () => {
    if (activeCategory) void searchByTag(activeCategory);
    else if (activeKeyword) void search(activeKeyword);
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-4xl space-y-6 py-5 sm:py-7" data-testid="search-page">
      <header className="flex min-w-0 items-center gap-3 border-b-2 border-ink pb-5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="返回上一页"
          title="返回"
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <SearchBar
          value={keyword}
          onValueChange={setKeyword}
          onSubmit={handleSearch}
          onClear={handleClear}
          placeholder={activeCategory ? `分类：${activeCategory}` : '搜索游戏、攻略、评测...'}
          className="min-w-0 flex-1"
        />
      </header>

      {!hasQuery && history.length > 0 ? (
        <Card variant="panel" padding="default" data-slot="search-history">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-primary">RECENT SEARCHES</p>
              <h1 className="font-heading text-xl font-black text-foreground">最近搜索</h1>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={clearHistory}>
              <Trash2 aria-hidden="true" />
              清空历史
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {history.map((item) => (
              <Button key={item} type="button" variant="secondary" size="sm" onClick={() => handleSearch(item)}>
                {item}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {!hasQuery && history.length === 0 ? (
        <section data-slot="search-state" data-state="idle">
          <PageState
            state="idle"
            title="搜索玩家社区"
            description="输入游戏、攻略或评测关键词开始搜索。"
            icon={<SearchIcon aria-hidden="true" />}
          />
        </section>
      ) : null}

      {hasQuery ? (
        <section className="space-y-4" aria-labelledby="search-results-heading">
          <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">SEARCH RESULTS</p>
              <h1 id="search-results-heading" className="break-words font-heading text-xl font-black text-foreground sm:text-2xl">
                {activeCategory ? `分类：${activeCategory}` : `“${activeKeyword}”`}
              </h1>
            </div>
            {!loading && !error ? (
              <span className="shrink-0 text-xs font-bold text-muted-foreground">共 {suggestions.length} 篇</span>
            ) : null}
          </div>

          <div data-slot="search-state" data-state={loading ? 'loading' : error ? 'error' : suggestions.length ? 'success' : 'empty'}>
            {loading ? (
              <PageState state="loading" title="搜索中" description="正在匹配站内帖子。" compact />
            ) : error ? (
              <PageState
                state="error"
                title="搜索失败"
                description={error}
                compact
                action={(
                  <Button type="button" variant="outline" size="sm" onClick={retrySearch}>
                    重试
                  </Button>
                )}
              />
            ) : suggestions.length === 0 ? (
              <PageState
                state="empty"
                title="暂无搜索结果"
                description="尝试更换关键词或使用更简短的描述。"
                compact
              />
            ) : (
              <div className="grid min-w-0 gap-4" data-testid="search-results">
                {suggestions.map((post) => (
                  <PostItem key={post.id} post={post} highlight={activeCategory ? undefined : activeKeyword} />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const activeCategory = categoryParam && categoryParam !== 'all' ? categoryParam : null;
  const initialKeyword = activeCategory ? '' : searchParams.get('q') ?? '';

  return (
    <SearchContent
      key={`${activeCategory ?? ''}|${initialKeyword}`}
      activeCategory={activeCategory}
      initialKeyword={initialKeyword}
    />
  );
}
