// react 版本的防抖hooks 通用的
import {
    useEffect,
    useState
} from "react";

// 泛型，类型的传参 
// keyword? 
export function useDebounce<T>(value:T,delay:number):T{
    const [debounceValue, setDebounceValue] = useState<T>(value); // 返回防抖后的值
    // api 请求会由 setDebounce 负责
    useEffect(()=>{
        const handler = setTimeout(()=>{
            setDebounceValue(value);
        },delay)
        // 如果输入，handler 根据 timeout id 清除上一个定时器
        // 不输入，时间到，定时器触发，刷新debouncevalue
        // 依赖项更新时，触发上一个effect的清理函数 清除上一个定时器，再进行这一个effect
        return ()=>{
            clearTimeout(handler);
        }
    },[value,delay])
    return debounceValue;
}