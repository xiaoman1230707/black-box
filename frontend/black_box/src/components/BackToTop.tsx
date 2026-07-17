import {
    useEffect,
    useState,
    type FC,
} from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { throttle } from '@/utils';

interface BackToTopProps {
    // 滚动阈值 超过多少像素后显示按钮
    threshold?: number;
}

const BackToTop:FC<BackToTopProps> = ({threshold=100})=>{
    const [isVisible,setIsVisible] = useState<boolean>(false);
    const scrollTop = ()=>{
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            return;
        }
        window.scrollTo({
            top:0,
            behavior:'smooth'
        })
    }
    useEffect(()=>{
        const toggleVisibility =()=>{
        setIsVisible(window.scrollY>threshold)
    };
    const thtottled_func = throttle(toggleVisibility,200);
        window.addEventListener('scroll',thtottled_func);
        return ()=> window.removeEventListener('scroll',thtottled_func);
        
    },[threshold]) 


    if(!isVisible){
        return null
    }
    return (
        <Button 
        variant="outline"
        size="icon"
        onClick={scrollTop}
        className="fixed right-[var(--container-gutter-tablet)] bottom-[var(--container-gutter-tablet)] z-50 rounded-pill max-[760px]:right-[var(--container-gutter-phone)] max-[760px]:bottom-[calc(var(--bottombar-h)+env(safe-area-inset-bottom)+var(--container-gutter-phone))]"
        aria-label="返回顶部"
        title="返回顶部"
        >
            <ArrowUp className='h-4 w-4' aria-hidden="true" />
        </Button>
    )
} 

export default BackToTop
