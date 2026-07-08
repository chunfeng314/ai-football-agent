import { create } from 'zustand';
import { createSSEConnection } from '../api/client';
import type { ChatMessage, AgentResponse } from '../types';

interface ChatState {
  messages: ChatMessage[];
  streaming: boolean;
  streamContent: string;
  streamAgentResponse: AgentResponse | null;
  toolStatus: string | null;
  error: string | null;
  eventSource: EventSource | null;

  sendMessage: (text: string) => void;
  clearChat: () => void;
  abortStream: () => void;
}

let msgId = 0;
function nextId() {
  return `msg-${++msgId}-${Date.now()}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  streaming: false,
  streamContent: '',
  streamAgentResponse: null,
  toolStatus: null,
  error: null,
  eventSource: null,

  sendMessage: (text: string) => {
    // 关闭旧连接
    const oldEs = get().eventSource;
    if (oldEs) oldEs.close();

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      messages: [...s.messages, userMsg],
      streaming: true,
      streamContent: '',
      streamAgentResponse: null,
      toolStatus: null,
      error: null,
    }));

    // 创建 SSE 连接
    const es = createSSEConnection(
      `/api/chat/stream?message=${encodeURIComponent(text)}`,
      (event, data) => {
        switch (event) {
          case 'thinking':
            set({ toolStatus: '🤔 思考中...' });
            break;
          case 'tool_start':
            set({ toolStatus: `🔧 正在查询: ${data.tool || ''}` });
            break;
          case 'tool_end':
            set({ toolStatus: '📊 分析数据中...' });
            break;
          case 'token':
            set((s) => ({
              streamContent: s.streamContent + ((data.content as string) || ''),
            }));
            break;
          case 'structured':
            // 流式更新结构化响应
            if (data.response) {
              set({ streamAgentResponse: data.response as AgentResponse });
            }
            break;
          case 'done':
            // 完成
            set((s) => {
              const assistantMsg: ChatMessage = {
                id: nextId(),
                role: 'assistant',
                content: s.streamContent,
                agentResponse: (data.response as AgentResponse) || s.streamAgentResponse || undefined,
                timestamp: new Date().toISOString(),
              };
              return {
                messages: [...s.messages, assistantMsg],
                streaming: false,
                streamContent: '',
                toolStatus: null,
                eventSource: null,
              };
            });
            break;
        }
      },
      () => {
        set({ error: '连接中断，请重试', streaming: false, toolStatus: null });
      }
    );

    set({ eventSource: es });
  },

  clearChat: () => {
    const es = get().eventSource;
    if (es) es.close();
    set({
      messages: [],
      streaming: false,
      streamContent: '',
      streamAgentResponse: null,
      toolStatus: null,
      error: null,
      eventSource: null,
    });
  },

  abortStream: () => {
    const es = get().eventSource;
    if (es) es.close();
    set({ streaming: false, toolStatus: null, eventSource: null });
  },
}));
