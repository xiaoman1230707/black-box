import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// 全局渲染兜底:翻译类等改 DOM 的浏览器扩展会篡改 React 管理的节点,
// 导致 React 19 在 navigate commit / portal 卸载时父子关系对不上 → insertBefore 崩溃。
// 由此捕获崩溃,显示"刷新重试"而非整树白屏。
// 恢复用整页 reload 而非 setState 重渲染:DOM 已被外部改乱,重渲染会再崩,
// 只有整页刷新拿到干净 DOM 才可靠;reload 而非 router navigate 也是因为崩时 router 可能正在 commit。
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 渲染崩溃被兜底:', error, info)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
        >
          <div className="max-w-md rounded-md border-2 border-ink bg-card p-6 shadow-md">
            <h1 className="font-heading text-xl leading-heading font-extrabold">页面出现了一点问题</h1>
            <p className="mt-2 text-sm leading-snug text-foreground-2">刷新页面可以恢复到干净状态。</p>
          </div>
          <Button variant="primary" onClick={this.handleReload}>
            刷新重试
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
