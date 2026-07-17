import { useRef, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { ArrowRight, Plus, Trash2 } from "lucide-react"

import "@/App.css"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import PageState, { type PageStateKind } from "@/components/PageState"
import {
  Avatar,
  AvatarFallback,
  type AvatarCover,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { CountBadge } from "@/components/ui/count-badge"
import { Input } from "@/components/ui/input"
import { Pill } from "@/components/ui/pill"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatButton } from "@/components/ui/stat-button"
import { TagChip } from "@/components/ui/tag-chip"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/toaster"
import {
  getContentTypeVariant,
  type PillVariant,
} from "@/lib/content-type"
import { feedback } from "@/lib/feedback"

const PILL_VARIANTS: PillVariant[] = [
  "accent",
  "warm",
  "soft",
  "news",
  "guide",
  "help",
  "review",
  "event",
]

const GAMES = [
  ["black-myth", "黑神话：悟空"],
  ["genshin", "原神"],
  ["elden-ring", "艾尔登法环"],
  ["zelda", "塞尔达传说：王国之泪（长选项压力测试）"],
] as const

const GALLERY_SLIDES = [
  { title: "黑神话", cover: "bg-[image:var(--gradient-cv-1)]" },
  { title: "艾尔登法环", cover: "bg-[image:var(--gradient-cv-2)]" },
  { title: "塞尔达传说", cover: "bg-[image:var(--gradient-cv-3)]" },
] as const

export function GallerySection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="border-t-2 border-ink py-8 first:border-t-0 first:pt-0">
      <div className="mb-5">
        <h2 className="font-heading text-xl leading-heading font-extrabold">{title}</h2>
        <p className="mt-1 text-sm leading-snug text-foreground-2">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function Phase4ComponentGallery() {
  const [game, setGame] = useState<string | null>("black-myth")
  const [tag, setTag] = useState<string | number>("攻略")
  const [liked, setLiked] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const dialogTriggerRef = useRef<HTMLButtonElement | null>(null)
  const dialogCancelRef = useRef<HTMLButtonElement | null>(null)

  return (
    <main
      data-testid="phase4-component-gallery"
      className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-9"
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <header className="mb-10">
          <Pill variant="accent">P1 DEV ONLY</Pill>
          <h1 className="mt-4 max-w-4xl font-heading text-3xl leading-tight font-black tracking-display">
            第四期基础组件 Gallery
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-foreground-2">
            Token、状态、键盘和窄屏压力面。此入口不注册产品路由，也不进入生产入口。
          </p>
        </header>

        <GallerySection title="Button" description="语义 variant、兼容 size、busy 与 disabled。">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary"><Plus />主操作</Button>
            <Button variant="secondary">次操作</Button>
            <Button variant="outline">描边</Button>
            <Button variant="default">default → outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive"><Trash2 />删除</Button>
            <Button variant="link">文字链接</Button>
            <Button variant="primary" busy>处理中</Button>
            <Button disabled>已禁用</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button size="xs">Legacy XS</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="primary" aria-label="新增" title="新增"><Plus /></Button>
            <Button size="icon-sm" aria-label="继续" title="继续"><ArrowRight /></Button>
          </div>
        </GallerySection>

        <GallerySection title="Form Controls" description="正常、无效、禁用、长内容和 Select 键盘路径。">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              标题
              <Input defaultValue="虎先锋怎么打？" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              无效输入
              <Input aria-invalid="true" defaultValue="错误值" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              禁用输入
              <Input disabled defaultValue="不可编辑" />
            </label>
            <div className="grid gap-2 text-sm font-bold">
              游戏
              <Select value={game} onValueChange={setGame} items={GAMES.map(([value, label]) => ({ value, label }))}>
                <SelectTrigger aria-label="选择游戏">
                  <SelectValue placeholder="请选择游戏" />
                </SelectTrigger>
                <SelectContent>
                  {GAMES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="grid gap-2 text-sm font-bold md:col-span-2">
              正文
              <Textarea defaultValue="保留键盘操作、清晰焦点和纵向 resize。" />
            </label>
          </div>
        </GallerySection>

        <GallerySection title="Pill 与内容类型" description="固定类型色；未知类型必须回退 soft。">
          <div className="flex flex-wrap gap-3">
            {PILL_VARIANTS.map((variant) => <Pill key={variant} variant={variant}>{variant}</Pill>)}
            <Pill variant={getContentTypeVariant("未知类型")}>未知类型 → soft</Pill>
          </div>
        </GallerySection>

        <GallerySection title="Avatar 与 CountBadge" description="28/44/72、8 个静态 cover、首字母 fallback 和计数边界。">
          <div className="flex flex-wrap items-end gap-4">
            <Avatar size="sm" cv={1}><AvatarFallback>小</AvatarFallback></Avatar>
            <Avatar size="md" cv={2}><AvatarFallback>中</AvatarFallback></Avatar>
            <Avatar size="lg" cv={3}><AvatarFallback>大</AvatarFallback></Avatar>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((cv) => (
              <Avatar key={cv} size="md" cv={cv as AvatarCover}>
                <AvatarFallback>{cv}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-sm">
            {[0, 999, 1000, 10500].map((value) => (
              <span key={value} className="inline-flex items-center gap-2">{value}: <CountBadge value={value} /></span>
            ))}
          </div>
        </GallerySection>

        <GallerySection title="Card" description="Panel/Tile 与 none/sm/default padding，不形成卡套卡。">
          <div className="grid gap-6 md:grid-cols-2">
            <Card variant="panel" padding="default">
              <CardHeader>
                <CardTitle>Panel</CardTitle>
                <CardDescription>强描边与硬阴影，用于真实工具或内容面板。</CardDescription>
                <CardAction><Pill variant="guide">攻略</Pill></CardAction>
              </CardHeader>
              <CardContent>稳定的 Header、Content、Footer slot。</CardContent>
              <CardFooter><Button size="sm" variant="primary">确认</Button></CardFooter>
            </Card>
            <Card variant="tile" padding="sm">
              <CardHeader>
                <CardTitle>Tile</CardTitle>
                <CardDescription>弱描边磁贴，hover 转墨边。</CardDescription>
              </CardHeader>
              <CardContent>长用户名压力测试：爱睡觉的旅人和他的超长展示名称</CardContent>
            </Card>
          </div>
        </GallerySection>

        <GallerySection title="TagChip 与 StatButton" description="业务激活态统一由 data-state 驱动。">
          <div className="flex max-w-full gap-3 overflow-x-auto pb-3">
            {["资讯", "攻略", "求助", "评测", "活动"].map((value) => (
              <TagChip
                key={value}
                value={value}
                active={tag === value}
                variant={getContentTypeVariant(value)}
                onSelect={setTag}
              >
                {value}
              </TagChip>
            ))}
            <TagChip value="disabled" disabled>不可选</TagChip>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <StatButton variant="like" count={1000} active={liked} onClick={() => setLiked((value) => !value)} />
            <StatButton variant="comment" count={32} onClick={() => undefined} />
            <StatButton variant="view" count={10500} />
            <StatButton variant="like" count={8} busy onClick={() => undefined} />
          </div>
        </GallerySection>

        <GallerySection title="Carousel" description="保留 Embla、方向键、控制按钮和 reduced-motion。">
          <Carousel opts={{ loop: true }} aria-label="组件示例轮播" className="rounded-lg border-2 border-ink bg-card shadow-lg">
            <CarouselContent>
              {GALLERY_SLIDES.map(({ title, cover }) => (
                <CarouselItem key={title}>
                  <div className={`grid h-52 place-items-center px-16 py-8 text-center text-primary-foreground sm:h-auto sm:min-h-52 sm:aspect-[16/7] ${cover}`}>
                    <strong className="max-w-24 text-base leading-tight sm:max-w-none sm:text-2xl sm:leading-heading">
                      {title}
                    </strong>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </GallerySection>

        <GallerySection title="PageState 与反馈" description="真实状态、稳定 skeleton、toast 去重和 AlertDialog 焦点。">
          <div className="grid gap-4 md:grid-cols-2">
            {(["idle", "loading", "empty", "error"] as PageStateKind[]).map((state) => (
              <PageState
                key={state}
                state={state}
                title={`${state} 状态`}
                description="页面只负责呈现数据层提供的真实结果。"
                compact
              />
            ))}
          </div>
          <div className="mt-5 grid gap-3 rounded-md border-2 border-ink bg-card p-4 sm:grid-cols-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 sm:col-span-2" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => feedback.success("操作已完成", { id: "gallery-feedback" })}
            >
              同 id success toast
            </Button>
            <Button
              ref={dialogTriggerRef}
              type="button"
              variant="destructive"
              onClick={() => setDialogOpen(true)}
            >
              打开删除确认
            </Button>
          </div>
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogContent
              initialFocus={dialogCancelRef}
              finalFocus={dialogTriggerRef}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>删除这条内容？</AlertDialogTitle>
                <AlertDialogDescription>该操作无法撤销，取消是默认安全动作。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel ref={dialogCancelRef}>取消</AlertDialogCancel>
                <Button type="button" variant="destructive" onClick={() => setDialogOpen(false)}>
                  确认删除
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </GallerySection>

        <GallerySection title="MarkdownRenderer" description="旧换行、GFM、长内容和危险 HTML 共用同一安全策略。">
          <div className="min-w-0 rounded-md border-2 border-ink bg-card p-5">
            <MarkdownRenderer
              content={'# 黑神话攻略\n第一行\n第二行\n\n- [x] 已确认站内引用\n- [ ] 继续测试\n\n| Boss | 处理 |\n| --- | --- |\n| 虎先锋 | 中距离观察 |\n\n```ts\nconst veryLongStrategyName = "保持距离后再反击"\n```\n\n[站内帖子](/post/39) [外链](https://example.com)\n\n<script>alert(1)</script>'}
            />
          </div>
        </GallerySection>
      </div>
      <Toaster />
    </main>
  )
}

const galleryRoot = document.getElementById("phase4-gallery-root")
if (import.meta.env.DEV && galleryRoot) {
  createRoot(galleryRoot).render(<Phase4ComponentGallery />)
}
