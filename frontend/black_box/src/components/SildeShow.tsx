import {
    useRef,// 持久化存储对象，dom对象的引用
    useEffect,
    useState
} from 'react';
// 第三方库 自动滚动播放
import Autoplay from 'embla-carousel-autoplay';
import {
    CarouselContent,
    CarouselItem,
    type CarouselApi,
    Carousel,// 轮播图
} from "@/components/ui/carousel"

export interface SlideData {
    id:number | string;
    image:string;
    title?:string;
}
interface SlideShowProps{
    slides:SlideData[];
    autoPlay?:boolean;// 是否自动播放
    autoPlayDelay?:number;// 自动播放间隔时间
}

const SlideShow:React.FC<SlideShowProps> = ({
    slides,
    autoPlay=true,
    autoPlayDelay=3000
})=>{
    const [selectedIndex,setSelectedIndex] = useState<number>(0);
    const [api,setApi] = useState<CarouselApi | null>(null);
    useEffect(()=>{
        // console.log(api,'????')
        if(!api) return;
        const onSelect = ()=> setSelectedIndex(api.selectedScrollSnap());
        api.on('select',onSelect);
        return () => {api.off('select',onSelect)};
    },[api])

    // Autoplay 耗费性能 不需要再任何响应式更新时都重新创建
    const plugin = useRef(
        autoPlay? Autoplay({delay:autoPlayDelay,stopOnInteraction:false}) : null
    );// stopOnInteraction: true 的含义就是：只要用户有任何交互（点击、拖动、滑动），就永久停止自动播放
    return(
        <div className="relative w-full">
            <Carousel className='w-full'
            setApi={setApi}
            plugins={plugin.current?[plugin.current]:[]}
            opts={{loop:true}}
            onMouseEnter={()=>plugin.current?.stop()}
            onMouseLeave={()=>plugin.current?.reset()}
            >
                <CarouselContent>
                   {
                    slides.map(({id,image,title},index)=>(
                       <CarouselItem key={id}>
                         <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden">
                            <img 
                            src={image}
                            alt={title || `slide ${index + 1}` }//没有图片 默认
                            className="w-full h-full object-cover"
                            />
                            {
                                title && (
                                    <div 
                                    className="absolute bottom-0 left-0 right-0 
                                    bg-gradient-to-t from-black/60 to-transparent
                                    p-4 text-white">
                                        <h3 className="text-lg font-bold">{title}</h3>
                                    </div>
                                )
                            }
                        </div>
                       </CarouselItem>
                    ))
                   }
                </CarouselContent>
            </Carousel>
            <div className="absolute bottom-3 left-0 right-0 flex
            justify-center gap-2
            ">
                {
                    // i index 重要状态 _ 占位，用不到。但是作为map参数 一定要出席
                    slides.map((_,i)=>(
                        <button key={i}
                        className={`h-2 w-2 rounded-full transition-all 
                            ${selectedIndex === i ? "bg-white w-6" : "bg-white/30"}`}
                        />
                    ))
                }
            </div>
        </div>
    )
}

export default  SlideShow;


