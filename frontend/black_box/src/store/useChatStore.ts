import { create } from 'zustand';
import type { Message } from '@ai-sdk/react';

// 三期 §5.5:游戏 AI 助手对话「内存保持」
//   目标:切走 Chat 再切回,对话不丢;刷新可丢(拍板「store 内存保持 + 不落库」)。
//   故此 store 刻意「不 persist」(对照 useUserStore 用 persist;本 store 同 useHomeStore 裸 create)。
//   单会话即可(概要未要求多会话);后端不存会话历史(ChatDto.id 维持现状,不建会话表)。
interface ChatState {
    messages: Message[];
    setMessages: (messages: Message[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    setMessages: (messages) => set({ messages }),
}));
