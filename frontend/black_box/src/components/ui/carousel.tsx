"use client"

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CarouselContext,
  type CarouselApi,
  type CarouselOrientation,
  useCarousel,
} from "@/components/ui/carousel-context"
import { ChevronLeft, ChevronRight } from "lucide-react"

type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: CarouselOrientation
  setApi?: (api: CarouselApi) => void
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((emblaApi: CarouselApi) => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const previousKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp"
      const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown"

      if (event.key === previousKey) {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === nextKey) {
        event.preventDefault()
        scrollNext()
      }
    },
    [orientation, scrollNext, scrollPrev]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on("reInit", onSelect)
    api.on("select", onSelect)

    return () => {
      api.off("reInit", onSelect)
      api.off("select", onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        orientation,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        data-orientation={orientation}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden rounded-lg outline-none focus-within:[box-shadow:var(--focus-ring)]"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex touch-pan-y motion-reduce:transition-none",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute z-10 rounded-pill bg-card touch-manipulation motion-reduce:transform-none",
        orientation === "horizontal"
          ? "bottom-4 left-4 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2"
          : "top-4 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      aria-label="上一张"
      title="上一张"
      {...props}
    >
      <ChevronLeft aria-hidden="true" />
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute z-10 rounded-pill bg-card touch-manipulation motion-reduce:transform-none",
        orientation === "horizontal"
          ? "right-4 bottom-4 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2"
          : "bottom-4 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      aria-label="下一张"
      title="下一张"
      {...props}
    >
      <ChevronRight aria-hidden="true" />
    </Button>
  )
}

export type { CarouselApi }
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
// Compatibility export; the hook lives in a non-component module for Fast Refresh.
// eslint-disable-next-line react-refresh/only-export-components
export { useCarousel } from "@/components/ui/carousel-context"
