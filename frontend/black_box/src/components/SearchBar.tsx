import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchBarProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  loading?: boolean;
  showKbd?: boolean;
  className?: string;
}

export default function SearchBar({
  value,
  defaultValue = '',
  onValueChange,
  onSubmit,
  onClear,
  placeholder = '搜索帖子…',
  loading = false,
  showKbd = true,
  className,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;

  const updateValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateValue(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loading) onSubmit(currentValue.trim());
  };

  const handleClear = () => {
    updateValue('');
    onClear?.();
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn('flex min-w-0 items-center gap-2', className)}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={currentValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={loading}
          className="pr-24 pl-10"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {currentValue ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={loading}
              aria-label="清除搜索词"
              title="清除"
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
          {showKbd ? (
            <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground max-[600px]:hidden">
              Enter
            </kbd>
          ) : null}
        </div>
      </div>
      <Button type="submit" variant="primary" size="icon" busy={loading} aria-label="搜索" title="搜索">
        <Search aria-hidden="true" />
      </Button>
    </form>
  );
}
