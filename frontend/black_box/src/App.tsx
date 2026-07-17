import '@/App.css'
import BackToTop from '@/components/BackToTop';

// 一期:路由守卫已迁移到路由级 <RequireAuth>(见 router/index.tsx),
// 原 needsLogin + useEffect 兜底守卫已移除,守卫单一来源。
// App 作为 RouterConfig children 渲染在 Router 内,承载全局 BackToTop。
function App() {
  return (
    <>
    <BackToTop />
    </>
  )
}

export default App
