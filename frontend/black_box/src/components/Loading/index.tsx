import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="正在加载"
      className="fixed inset-0 z-50 grid place-items-center bg-background/80"
    >
      <div className="grid size-16 place-items-center rounded-md border-2 border-ink bg-card shadow-md">
        <LoaderCircle className="size-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      </div>
      <span className="sr-only">正在加载</span>
    </div>
  );
}
