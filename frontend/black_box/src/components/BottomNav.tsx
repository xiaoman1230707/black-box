import { Home,User,MessageCircle } from 'lucide-react';// 图标字体库
import {
    useNavigate,//跳转功能
    useLocation//获取当前路由信息
} from 'react-router-dom';
import {cn} from '@/lib/utils';// 分条件组合类名 
import { useUserStore } from '@/store/useUserStore';
import { needsLogin } from '@/App';

export default function BottomNav(){
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const {isLogin} = useUserStore();
    // console.log(location);
    const tabs = [
        {
            label:"首页",
            path:"/",
            icon:Home
        },
        {
            label:"聊天",
            path:"/chat",
            icon:MessageCircle
        },
        {
            label:"我的",
            path:"/mine",
            icon:User
        },
    ]
    const handleNav = (path:string) =>{
        if(pathname === path){//如果当前路由和点击的路由相同，就没必要切换
            return;
        }
        if(needsLogin.includes(path) && !isLogin){
            navigate('/login');
            return;
        }
        navigate(path);
    }

    return(
        <>
        <div className="fixed bottom-0 left-0 right-0 h-16
    border-t border-orange-200/30 bg-background/95 backdrop-blur-lg
    flex items-center justify-around z-50 safe-area-bottom
    shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {
                tabs.map(tab =>{
                    const Icon = tab.icon;
                    const isActive = pathname === tab.path;
                    return <button
                    key={tab.path}
                    onClick={()=>handleNav(tab.path)}
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 relative",
                        isActive && "after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-0.5 after:bg-primary after:rounded-full"
                    )}
                    >
                        <Icon
                        size={22}
                        className={cn(
                            "transition-all duration-300",
                            isActive ? "text-primary scale-110" : "text-muted-foreground"
                        )}
                        />
                        <span className={cn(
                            "text-xs transition-colors",
                            isActive ? "text-primary font-semibold" : "text-muted-foreground"
                        )}>
                            {tab.label}
                        </span>
                    </button>
                })
            }
        </div>
        </>
    )
}