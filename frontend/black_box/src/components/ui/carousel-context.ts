import * as React from "react"
import type { UseEmblaCarouselType } from "embla-carousel-react"

export type CarouselApi = UseEmblaCarouselType[1]
export type CarouselOrientation = "horizontal" | "vertical"

export type CarouselContextValue = {
  carouselRef: UseEmblaCarouselType[0]
  api: CarouselApi
  orientation: CarouselOrientation
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
}

export const CarouselContext =
  React.createContext<CarouselContextValue | null>(null)

export function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

