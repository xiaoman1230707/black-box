import { useState } from "react"
import { Eye, EyeOff, Gamepad2, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { doRegister } from "@/api/user"
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
import { useUserStore } from "@/store/useUserStore"
import { getApiErrorMessage } from "@/lib/api-error"
import { feedback } from "@/lib/feedback"

type Mode = "login" | "register"

function scorePassword(value: string): number {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score++
  if (/[a-zA-Z]/.test(value) && /\d/.test(value)) score++
  if (/[^a-zA-Z0-9]/.test(value) || value.length >= 12) score++
  return Math.max(1, score)
}

const STRENGTH_LABELS = ["", "弱", "中", "强"]
const STRENGTH_CLASSES = [
  "bg-muted",
  "bg-destructive",
  "bg-type-event",
  "bg-type-guide",
]

export default function Login() {
  const navigate = useNavigate()
  const login = useUserStore((state) => state.login)
  const [mode, setMode] = useState<Mode>("login")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [form, setForm] = useState({ name: "", password: "", confirm: "" })

  const strength = scorePassword(form.password)
  const strengthLabel = STRENGTH_LABELS[strength]

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setError("")
    setInfo("")
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target
    setForm((current) => ({ ...current, [id]: value }))
    setError("")
  }

  const doLoginFlow = async (name: string, password: string) => {
    await login({ name, password })
    navigate("/", { replace: true })
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = form.name.trim()
    const password = form.password.trim()
    if (!name || !password) return

    setLoading(true)
    setError("")
    try {
      await doLoginFlow(name, password)
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, "登录失败，请检查用户名和密码"))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = form.name.trim()
    const password = form.password.trim()
    if (!name || !password) return
    if (password !== form.confirm.trim()) {
      setError("两次输入的密码不一致")
      return
    }

    setLoading(true)
    setError("")
    setInfo("")
    try {
      await doRegister({ name, password })
      feedback.success("注册成功", { id: "auth-register" })
      try {
        await doLoginFlow(name, password)
      } catch {
        setMode("login")
        setInfo("注册成功，请登录")
        setForm((current) => ({ ...current, confirm: "" }))
      }
    } catch (registerError) {
      setError(getApiErrorMessage(registerError, "注册失败"))
    } finally {
      setLoading(false)
    }
  }

  const submitLabel = mode === "login" ? "立即登录" : "注册并登录"

  return (
    <div
      className="grid min-h-dvh bg-background min-[861px]:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)]"
      data-testid="login-page"
    >
      <aside className="relative hidden min-w-0 overflow-hidden border-r-2 border-ink bg-primary p-10 text-primary-foreground min-[861px]:flex min-[861px]:flex-col min-[861px]:justify-between lg:p-14">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-sm border-2 border-ink bg-card text-foreground shadow-sm">
            <Gamepad2 className="size-7" aria-hidden="true" />
          </span>
          <span className="font-heading text-xl font-extrabold">Black-box</span>
        </div>

        <div className="max-w-xl">
          <p className="font-heading text-5xl leading-heading font-extrabold lg:text-6xl">
            玩家社区
          </p>
          <p className="mt-5 max-w-lg text-lg font-semibold leading-relaxed">
            攻略、评测与讨论，和玩家一起找到下一段冒险。
          </p>
        </div>

        <p className="text-sm font-semibold opacity-80">Black-box 游戏社区</p>
      </aside>

      <main className="flex min-h-dvh min-w-0 items-center justify-center px-4 py-8 sm:px-8 min-[861px]:py-12">
        <Card className="w-full max-w-md overflow-visible">
          <CardHeader className="border-b-2 border-border pb-5">
            <div className="mb-3 flex items-center gap-2 min-[861px]:hidden">
              <span className="grid size-10 place-items-center rounded-sm border-2 border-ink bg-primary text-primary-foreground shadow-sm">
                <Gamepad2 className="size-5" aria-hidden="true" />
              </span>
              <span className="font-heading text-lg font-extrabold">Black-box</span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              {mode === "login" ? "欢迎回来" : "加入社区"}
            </CardTitle>
            <CardDescription>
              {mode === "login" ? "登录后继续你的游戏讨论。" : "创建账号并开始分享。"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div
              className="mb-6 grid grid-cols-2 gap-1 rounded-sm border-2 border-ink bg-muted p-1"
              aria-label="登录方式"
            >
              {(["login", "register"] as const).map((item) => {
                const active = mode === item
                return (
                  <button
                    key={item}
                    type="button"
                    data-testid={`seg-${item}`}
                    data-state={active ? "active" : "inactive"}
                    onClick={() => switchMode(item)}
                    className="min-h-11 rounded-[calc(var(--radius-sm)-2px)] px-4 text-sm font-bold text-foreground outline-none transition-[background-color,box-shadow] data-[state=active]:bg-card data-[state=active]:shadow-sm focus-visible:[box-shadow:var(--focus-ring)] motion-reduce:transition-none"
                  >
                    {item === "login" ? "登录" : "注册"}
                  </button>
                )
              })}
            </div>

            <form
              onSubmit={mode === "login" ? handleLogin : handleRegister}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="name">{mode === "login" ? "用户名" : "昵称"}</Label>
                <Input
                  id="name"
                  data-testid="auth-name"
                  placeholder={mode === "login" ? "请输入用户名" : "请输入昵称"}
                  value={form.name}
                  onChange={onChange}
                  autoComplete={mode === "login" ? "username" : "nickname"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="auth-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "login" ? "请输入密码" : "≥8 位，含字母和数字"}
                    value={form.password}
                    onChange={onChange}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="pr-14"
                  />
                  <span className="absolute top-1/2 right-0 z-10 -translate-y-1/2">
                    <Button
                      type="button"
                      data-testid="pw-toggle"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((current) => !current)}
                      className="shadow-none hover:translate-y-0 active:translate-y-0"
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-5" aria-hidden="true" />
                      ) : (
                        <Eye className="size-5" aria-hidden="true" />
                      )}
                    </Button>
                  </span>
                </div>

                {mode === "register" ? (
                  <div
                    className="flex items-center gap-2"
                    data-testid="password-strength"
                    data-level={strength}
                  >
                    <div className="flex flex-1 gap-1" aria-hidden="true">
                      {[1, 2, 3].map((level) => (
                        <span
                          key={level}
                          data-state={strength >= level ? "active" : "inactive"}
                          className={`h-2 flex-1 rounded-pill ${
                            strength >= level ? STRENGTH_CLASSES[strength] : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="w-6 text-xs font-bold text-foreground-2">
                      {strengthLabel}
                    </span>
                  </div>
                ) : null}
              </div>

              {mode === "register" ? (
                <div className="space-y-2">
                  <Label htmlFor="confirm">确认密码</Label>
                  <Input
                    id="confirm"
                    data-testid="auth-confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="再次输入密码"
                    value={form.confirm}
                    onChange={onChange}
                    autoComplete="new-password"
                  />
                </div>
              ) : null}

              {info ? (
                <p className="rounded-sm border-2 border-border bg-surface-warm px-4 py-3 text-center text-sm font-semibold">
                  {info}
                </p>
              ) : null}
              {error ? (
                <p
                  role="alert"
                  className="break-words rounded-sm border-2 border-destructive bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive"
                  data-testid="auth-error"
                >
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                data-testid="auth-submit"
                variant="primary"
                size="lg"
                busy={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : null}
                {loading ? "处理中..." : submitLabel}
              </Button>
            </form>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="mt-3 w-full"
              onClick={() => navigate("/")}
            >
              暂不登录，回首页
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
