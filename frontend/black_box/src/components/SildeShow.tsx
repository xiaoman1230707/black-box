import { useEffect, useRef, useState, type FC } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

export interface SlideData {
  id: number | string;
  image: string;
  title?: string;
}

interface SlideShowProps {
  slides: SlideData[];
  autoPlay?: boolean;
  autoPlayDelay?: number;
}

const COVER_CLASSES = [
  'bg-[image:var(--gradient-cv-1)]',
  'bg-[image:var(--gradient-cv-2)]',
  'bg-[image:var(--gradient-cv-3)]',
  'bg-[image:var(--gradient-cv-4)]',
] as const;

const SlideShow: FC<SlideShowProps> = ({
  slides,
  autoPlay = true,
  autoPlayDelay = 3000,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const reducedMotionAtMount =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const plugin = useRef(
    autoPlay
      ? Autoplay({
          delay: autoPlayDelay,
          stopOnInteraction: false,
          playOnInit: !reducedMotionAtMount,
        })
      : null
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const autoplay = api.plugins().autoplay;
    if (!autoplay) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncAutoplay = () => {
      if (media.matches) autoplay.stop();
      else autoplay.play();
    };
    syncAutoplay();
    media.addEventListener('change', syncAutoplay);
    return () => media.removeEventListener('change', syncAutoplay);
  }, [api]);

  const handleImageError = (image: string) => {
    setFailedImages((current) => {
      const next = new Set(current);
      next.add(image);
      return next;
    });
  };

  const handleMouseLeave = () => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      api?.plugins().autoplay?.reset();
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg border-2 border-ink bg-card shadow-lg">
      <Carousel
        className="w-full"
        setApi={setApi}
        plugins={plugin.current ? [plugin.current] : []}
        opts={{ loop: true }}
        onMouseEnter={() => api?.plugins().autoplay?.stop()}
        onMouseLeave={handleMouseLeave}
      >
        <CarouselContent className="ml-0">
          {slides.map(({ id, image, title }, index) => {
            const imageFailed = failedImages.has(image);
            return (
              <CarouselItem key={id} className="pl-0">
                <div
                  className={cn(
                    'relative aspect-video w-full overflow-hidden bg-muted',
                    imageFailed && COVER_CLASSES[index % COVER_CLASSES.length]
                  )}
                >
                  {!imageFailed ? (
                    <img
                      src={image}
                      alt={title || `轮播图 ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={() => handleImageError(image)}
                    />
                  ) : (
                    <div className="grid h-full place-items-center px-8 text-center text-xl font-extrabold text-primary-foreground">
                      {title || '玩家社区'}
                    </div>
                  )}
                  {title && !imageFailed ? (
                    <div className="absolute inset-x-0 top-0 bg-foreground/85 px-4 py-3 text-primary-foreground sm:top-auto sm:bottom-0 sm:px-6 sm:pt-4 sm:pb-14">
                      <h3 className="line-clamp-2 break-words text-base leading-heading font-extrabold sm:max-w-[calc(100%-6rem)] sm:text-xl">
                        {title}
                      </h3>
                    </div>
                  ) : null}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {slides.length > 1 ? (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        ) : null}
      </Carousel>

      {slides.length > 1 ? (
        <div className="absolute inset-x-14 bottom-0 z-10 flex justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              data-state={selectedIndex === index ? 'active' : 'inactive'}
              onClick={() => api?.scrollTo(index)}
              className="group grid size-11 shrink-0 place-items-center rounded-pill outline-none focus-visible:[box-shadow:var(--focus-ring)]"
              aria-label={`切换到第 ${index + 1} 张`}
              aria-current={selectedIndex === index ? 'true' : undefined}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-pill border border-primary-foreground bg-foreground/45 transition-[width,background-color] duration-(--motion-fast) group-data-[state=active]:w-7 group-data-[state=active]:bg-primary motion-reduce:transition-none"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default SlideShow;
