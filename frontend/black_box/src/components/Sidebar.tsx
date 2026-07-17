import { Home, MessageCircle, PenSquare, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const NAV_ITEMS = [
  { label: '首页', path: '/', icon: Home },
  { label: '攻略助手', path: '/chat', icon: MessageCircle },
  { label: '发帖', path: '/compose', icon: PenSquare },
  { label: '我的', path: '/mine', icon: User },
];

export default function Sidebar() {
  const user = useUserStore((s) => s.user);

  return (
    <aside
      className="
        sticky top-0 z-40 flex h-screen w-[var(--sidebar-w)] flex-col border-r-2 border-ink bg-card
        max-[760px]:fixed max-[760px]:inset-x-0 max-[760px]:top-auto max-[760px]:bottom-0
        max-[760px]:h-[calc(var(--bottombar-h)+env(safe-area-inset-bottom))]
        max-[760px]:w-full max-[760px]:flex-row max-[760px]:border-r-0 max-[760px]:border-t-2
        max-[760px]:pb-[env(safe-area-inset-bottom)]
      "
    >
      {/* 品牌(手机隐藏) */}
      <div className="flex h-18 shrink-0 items-center justify-center gap-3 px-3 min-[1025px]:justify-start max-[760px]:hidden">
        <span className="grid size-10 shrink-0 place-items-center rounded-sm border-2 border-ink bg-primary font-extrabold text-primary-foreground shadow-sm">
          GG
        </span>
        <span className="hidden text-lg font-extrabold min-[1025px]:inline">玩家社区</span>
      </div>

      {/* 主导航 */}
      <nav
        className="
          flex flex-1 flex-col gap-2 p-3
          max-[760px]:flex-row max-[760px]:items-stretch max-[760px]:gap-0 max-[760px]:p-0
        "
      >
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className="block min-w-0 max-[760px]:flex-1"
            title={label}
          >
            {({ isActive }) => (
              <div
                data-state={isActive ? 'active' : 'inactive'}
                className="
                  flex min-h-11 items-center justify-center gap-3 rounded-sm border-2 border-transparent px-3 py-2.5 text-sm font-bold
                  text-muted-foreground transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--motion-fast)]
                  hover:bg-secondary hover:text-foreground
                  data-[state=active]:border-ink data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm
                  min-[1025px]:justify-start
                  max-[760px]:min-h-[var(--bottombar-h)] max-[760px]:flex-col max-[760px]:gap-1 max-[760px]:rounded-none max-[760px]:border-0 max-[760px]:py-2 max-[760px]:shadow-none
                  motion-reduce:transition-none
                "
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="hidden min-w-0 truncate min-[1025px]:inline max-[760px]:inline max-[760px]:text-xs">
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 用户卡(手机隐藏;读 useUserStore 现状,不新增业务) */}
      <div className="mt-auto shrink-0 border-t border-border p-3 max-[760px]:hidden">
        <div className="flex min-w-0 items-center justify-center gap-3 rounded-sm border-2 border-ink bg-background p-2 min-[1025px]:justify-start">
          <Avatar size="sm" cv={2}>
            {user?.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
            <AvatarFallback>{user?.name?.[0] ?? '游'}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 truncate text-sm font-bold min-[1025px]:inline">
            {user?.name ?? '未登录'}
          </span>
        </div>
      </div>
    </aside>
  );
}
