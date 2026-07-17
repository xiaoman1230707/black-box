import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';

// 一期路由级守卫:替代原 App.tsx 的 useEffect 兜底 + BottomNav 内守卫,守卫单一来源。
// 受保护路由用 <RequireAuth> 包裹;未登录重定向 /login。
export default function RequireAuth({ children }: { children: ReactNode }) {
  const isLogin = useUserStore((s) => s.isLogin);
  const location = useLocation();
  if (!isLogin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
