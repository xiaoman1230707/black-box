// input handleChange handleSubmit
// message 消息列表
// chat 业务
import { useEffect } from 'react'
import {
    useChat
} from '@ai-sdk/react'
import { useUserStore } from '@/store/useUserStore'
import { useChatStore } from '@/store/useChatStore'
import { apiUrl } from '@/config/runtime'
import { feedback } from '@/lib/feedback'
import { createTimeoutFetch } from '@/lib/fetch-with-timeout'

const chatFetch = createTimeoutFetch(55_000)

export const handleChatResponse = (response: Response) => {
    if (response.status === 429) {
        feedback.error('请求过于频繁，请稍后再试', {
            id: 'chat-rate-limited',
        })
    }
}

export const useChatbot=()=>{
    // §五:useChat 走 fetch、不经 axios 拦截器,故在此手动带 token(对齐 config.ts:store.getState().accessToken)
    const chat = useChat({
        api:apiUrl('/ai/chat'),
        fetch: chatFetch,
        headers: { Authorization: `Bearer ${useUserStore.getState().accessToken}` },
        onResponse: handleChatResponse,
        // §5.5 对话保持:mount 以 store 快照作 initialMessages 恢复。
        //   用 getState() 取「一次快照」而非订阅 —— useChat 仅在首次挂载消费 initialMessages,
        //   故快照不会随 store 变化回灌 useChat,从根上杜绝「store↔useChat 循环更新」。
        initialMessages: useChatStore.getState().messages,
        onError:(err)=>{
            console.error("Chat Error:", err);
        }
    })

    // §5.5 对话保持:useChat.messages 变化 → 单向写回 store(切走/切回靠它恢复)。
    //   单向(useChat → store),store 不反向驱动 useChat(见上 initialMessages 快照说明)→ 无环。
    const { messages } = chat
    useEffect(()=>{
        useChatStore.getState().setMessages(messages)
    },[messages])

    return chat
}
