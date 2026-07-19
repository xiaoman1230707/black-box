import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { FileText, Heart, LogOut, Upload } from "lucide-react"

import { uploadAvatar } from "@/api/upload"
import Loading from "@/components/Loading"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useUserStore } from "@/store/useUserStore"
import { getApiErrorMessage } from "@/lib/api-error"
import { feedback } from "@/lib/feedback"

export default function Mine() {
  const { user, logout, setAvatar } = useUserStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    // 保持既有时序：先关闭 Drawer，再显示全局 Loading。
    setOpen(false)
    setLoading(true)
    try {
      const response = await uploadAvatar(file)
      setAvatar(response.url)
      feedback.success("头像更新成功", { id: "avatar-upload" })
    } catch (error) {
      console.error("头像上传失败", error)
      feedback.error(getApiErrorMessage(error, "头像上传失败，请重试"), {
        id: "avatar-upload",
      })
    } finally {
      setLoading(false)
    }
  }

  const fallback = user?.name?.trim().charAt(0).toUpperCase() || "玩"

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">
      <header className="mb-5">
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">我的账户</h1>
        <p className="mt-1 text-sm text-foreground-2">管理当前账号与头像。</p>
      </header>

      <Card>
        <CardHeader className="border-b-2 border-border pb-5">
          <CardTitle>账户摘要</CardTitle>
          <CardDescription>当前登录身份</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center">
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger
                className="group flex min-h-11 shrink-0 items-center gap-3 rounded-sm border-2 border-ink bg-surface-warm p-2 pr-4 text-sm font-bold text-foreground shadow-sm outline-none transition-transform hover:-translate-y-0.5 focus-visible:[box-shadow:var(--focus-ring)] motion-reduce:transform-none"
                aria-label="修改头像"
              >
                <Avatar size="lg" data-testid="mine-avatar">
                  <AvatarImage key={user?.avatar} src={user?.avatar} alt="当前头像" />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <span>修改头像</span>
              </DrawerTrigger>
              <DrawerContent className="border-t-2 border-ink bg-card shadow-lg max-[760px]:bottom-[calc(var(--bottombar-h)+env(safe-area-inset-bottom))]">
                <div className="mx-auto w-full max-w-md">
                  <DrawerHeader className="text-left">
                    <DrawerTitle className="font-heading text-xl font-extrabold">修改头像</DrawerTitle>
                    <DrawerDescription>从本地选择一张图片更新头像。</DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 py-2">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full justify-start"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="avatar-upload-btn"
                    >
                      <Upload className="size-5" aria-hidden="true" />
                      从相册上传
                    </Button>
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="ghost" size="lg" className="w-full">
                        取消
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              data-testid="avatar-file-input"
              onChange={handleAvatarUpload}
            />

            <div className="min-w-0 flex-1">
              <p className="break-words font-heading text-2xl font-extrabold">
                {user?.name || "未命名玩家"}
              </p>
              <p className="mt-1 break-all text-sm text-foreground-2">
                ID: {user?.id ?? "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="mt-6 min-w-0 space-y-3" aria-labelledby="personal-content-heading">
        <div>
          <h2 id="personal-content-heading" className="font-heading text-xl font-extrabold">
            个人内容
          </h2>
          <p className="mt-1 text-sm text-foreground-2">查看我发布和收藏的帖子。</p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            render={<Link to="/mine/posts" />}
            nativeButton={false}
            variant="outline"
            size="lg"
            className="h-auto min-h-20 w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left"
            data-testid="mine-posts-link"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-sm border-2 border-ink bg-surface-warm">
              <FileText className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block break-words font-heading text-base font-extrabold">我的发布</span>
              <span className="mt-0.5 block break-words text-xs font-medium text-foreground-2">
                浏览我发布过的帖子
              </span>
            </span>
          </Button>

          <Button
            render={<Link to="/mine/likes" />}
            nativeButton={false}
            variant="outline"
            size="lg"
            className="h-auto min-h-20 w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left"
            data-testid="mine-likes-link"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-sm border-2 border-ink bg-secondary">
              <Heart className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block break-words font-heading text-base font-extrabold">我的收藏</span>
              <span className="mt-0.5 block break-words text-xs font-medium text-foreground-2">
                浏览我点赞过的帖子
              </span>
            </span>
          </Button>
        </div>
      </section>

      <Button
        variant="destructive"
        size="lg"
        className="mt-6 w-full sm:w-auto"
        onClick={logout}
      >
        <LogOut className="size-5" aria-hidden="true" />
        退出登录
      </Button>

      {loading ? <Loading /> : null}
    </main>
  )
}
