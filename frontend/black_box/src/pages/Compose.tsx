import { useEffect, useState } from "react"
import { Eye, ImagePlus, Loader2, Pencil, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { fetchGames } from "@/api/games"
import { createPost, fetchPostById, fetchTags } from "@/api/posts"
import { uploadImage } from "@/api/upload"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import PageState from "@/components/PageState"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TagChip } from "@/components/ui/tag-chip"
import { Textarea } from "@/components/ui/textarea"
import { getContentTypeVariant } from "@/lib/content-type"
import { getApiErrorMessage } from "@/lib/api-error"
import { feedback } from "@/lib/feedback"
import { useHomeStore } from "@/store/useHomeStore"
import type { Game } from "@/types"

type UploadedImage = { fileId: number; thumbnailUrl: string }

const NO_GAME = "none"

export default function Compose() {
  const navigate = useNavigate()
  const prependPost = useHomeStore((state) => state.prependPost)
  const [games, setGames] = useState<Game[]>([])
  const [tags, setTags] = useState<{ id: number; name: string }[]>([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [gameId, setGameId] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit")

  useEffect(() => {
    fetchGames().then(setGames)
    fetchTags().then(setTags)
  }, [])

  const toggleTag = (id: number) => {
    setSelectedTagIds((current) =>
      current.includes(id)
        ? current.filter((tagId) => tagId !== id)
        : [...current, id]
    )
  }

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (!files.length) return

    setUploading(true)
    setError("")
    for (const file of files) {
      try {
        const response = await uploadImage(file)
        setImages((current) => [
          ...current,
          { fileId: response.id, thumbnailUrl: response.thumbnailUrl },
        ])
      } catch (uploadError) {
        const message = getApiErrorMessage(uploadError, `图片「${file.name}」上传失败`)
        setError(message)
        feedback.error(message, { id: `compose-upload-${file.name}` })
      }
    }
    setUploading(false)
  }

  const removeImage = (fileId: number) => {
    setImages((current) => current.filter((image) => image.fileId !== fileId))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedTitle = title.trim()
    const normalizedContent = content.trim()
    if (!normalizedTitle) {
      setError("请填写标题")
      return
    }
    if (!normalizedContent) {
      setError("请填写正文")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const response = await createPost({
        title: normalizedTitle,
        content: normalizedContent,
        ...(gameId ? { gameId: Number(gameId) } : {}),
        ...(selectedTagIds.length ? { tagIds: selectedTagIds } : {}),
        ...(images.length
          ? { fileIds: images.map((image) => image.fileId) }
          : {}),
      })
      const newPost = await fetchPostById(response.id)
      if (newPost) prependPost(newPost)
      feedback.success("帖子发布成功", { id: "compose-submit" })
      navigate(`/post/${response.id}`)
    } catch (submitError) {
      const message = getApiErrorMessage(submitError, "发帖失败，请重试")
      setError(message)
      feedback.error(message, { id: "compose-submit" })
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(content.trim()) &&
    !submitting &&
    !uploading

  const gameItems = [
    { value: NO_GAME, label: "不选择游戏" },
    ...games.map((game) => ({ value: String(game.id), label: game.name })),
  ]

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6" data-testid="compose-page">
      <Card className="overflow-visible">
        <CardHeader className="border-b-2 border-border pb-5">
          <CardTitle className="text-2xl sm:text-3xl">发布帖子</CardTitle>
          <CardDescription>分享你的攻略、见闻或问题。</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                data-testid="compose-title"
                placeholder="请输入标题"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label id="game-label">关联游戏（可选）</Label>
              <Select
                value={gameId || NO_GAME}
                onValueChange={(value) =>
                  setGameId(value === NO_GAME || value == null ? "" : value)
                }
                items={gameItems}
              >
                <SelectTrigger
                  data-testid="compose-game"
                  aria-labelledby="game-label"
                >
                  <SelectValue placeholder="不选择游戏" />
                </SelectTrigger>
                <SelectContent>
                  {gameItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-bold">内容类型（可选，可多选）</legend>
              <div className="flex flex-wrap gap-2" data-testid="compose-tags">
                {tags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    value={tag.id}
                    data-testid="compose-tag"
                    active={selectedTagIds.includes(tag.id)}
                    variant={getContentTypeVariant(tag.name)}
                    onSelect={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </TagChip>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="compose-images">配图（可选）</Label>
              <div className="flex flex-wrap gap-3">
                {images.map((image) => (
                  <figure
                    key={image.fileId}
                    className="relative size-24 overflow-hidden rounded-sm border-2 border-ink bg-muted"
                  >
                    <img
                      src={image.thumbnailUrl}
                      alt="已上传的帖子配图"
                      className="size-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="icon"
                      onClick={() => removeImage(image.fileId)}
                      className="absolute top-1 right-1"
                      aria-label="移除图片"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </figure>
                ))}
                <Label
                  htmlFor="compose-images"
                  className="flex size-24 cursor-pointer items-center justify-center rounded-sm border-2 border-dashed border-ink bg-card text-foreground-2 transition-colors hover:bg-accent focus-within:[box-shadow:var(--focus-ring)]"
                >
                  {uploading ? (
                    <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="size-6" aria-hidden="true" />
                  )}
                  <span className="sr-only">选择帖子图片</span>
                  <input
                    id="compose-images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    data-testid="compose-image-input"
                    onChange={handleFiles}
                  />
                </Label>
              </div>
            </div>

            <div className="space-y-3" data-slot="markdown-editor">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="content">正文</Label>
                <div
                  className="flex rounded-sm border-2 border-ink bg-muted p-1 min-[1025px]:hidden"
                  aria-label="正文编辑模式"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-state={editorMode === "edit" ? "active" : "inactive"}
                    className="shadow-none data-[state=active]:bg-card data-[state=active]:shadow-sm"
                    onClick={() => setEditorMode("edit")}
                  >
                    <Pencil aria-hidden="true" />
                    编辑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-state={editorMode === "preview" ? "active" : "inactive"}
                    className="shadow-none data-[state=active]:bg-card data-[state=active]:shadow-sm"
                    onClick={() => setEditorMode("preview")}
                  >
                    <Eye aria-hidden="true" />
                    预览
                  </Button>
                </div>
              </div>

              <div className="grid min-w-0 gap-4 min-[1025px]:grid-cols-2">
                <div
                  data-state={editorMode === "edit" ? "active" : "inactive"}
                  className={editorMode === "preview" ? "hidden min-[1025px]:block" : "block"}
                >
                  <p className="mb-2 text-xs font-bold text-muted-foreground min-[1025px]:block max-[1024px]:sr-only">
                    MARKDOWN
                  </p>
                  <Textarea
                    id="content"
                    data-testid="compose-content"
                    placeholder="写下正文内容..."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={10}
                    className="min-h-80 resize-y"
                  />
                </div>

                <div
                  data-state={editorMode === "preview" ? "active" : "inactive"}
                  className={editorMode === "edit" ? "hidden min-w-0 min-[1025px]:block" : "block min-w-0"}
                >
                  <p className="mb-2 text-xs font-bold text-muted-foreground min-[1025px]:block max-[1024px]:sr-only">
                    PREVIEW
                  </p>
                  <div className="min-h-80 min-w-0 overflow-hidden rounded-sm border-2 border-ink bg-card p-4 sm:p-5">
                    <MarkdownRenderer
                      content={content}
                      empty={(
                        <PageState
                          state="empty"
                          title="暂无预览内容"
                          description="在编辑区输入 Markdown 后，这里会同步显示最终效果。"
                          compact
                          className="min-h-64 border-0 bg-transparent"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-sm border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
                data-testid="compose-error"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              data-testid="compose-submit"
              disabled={!canSubmit}
              busy={submitting}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : null}
              {submitting ? "发布中..." : "发布"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
