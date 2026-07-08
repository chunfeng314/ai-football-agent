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
  abortFn: (() => void) | null;

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
  abortFn: null,

  sendMessage: (text: string) => {
    // 取消旧连接
    const oldAbort = get().abortFn;
    if (oldAbort) {
      oldAbort();
      set({ abortFn: null });
    }

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

    const conn = createSSEConnection(
      `/api/chat/stream?message=${encodeURIComponent(text)}&thread_id=default`,
      (event, data) => {
        set((s) => {
          // 如果已经不在流式状态，忽略事件（已中止）
          if (!s.streaming) return {};

          switch (event) {
            case 'thinking':
              return { toolStatus: '分析中...' };
            case 'tool_start':
              return { toolStatus: `查询: ${data.tool || ''}` };
            case 'tool_end':
              return { toolStatus: '分析数据中...' };
            case 'token':
              return { streamContent: s.streamContent + ((data.content as string) || '') };
            case 'structured':
              return { streamAgentResponse: data.response as AgentResponse };
            case 'done':
              return {};
            default:
              return {};
          }
        });
      },
      () => {
        // onDone — 流结束，保存为最终消息
        set((s) => {
          if (!s.streaming) return {};
          const assistantMsg: ChatMessage = {
            id: nextId(),
            role: 'assistant',
            content: s.streamContent,
            agentResponse: s.streamAgentResponse || undefined,
            timestamp: new Date().toISOString(),
          };
          return {
            messages: [...s.messages, assistantMsg],
            streaming: false,
            streamContent: '',
            toolStatus: null,
            abortFn: null,
          };
        });
      }
    );

    set({ abortFn: conn.abort });
  },

  clearChat: () => {
    const abortFn = get().abortFn;
    if (abortFn) abortFn();
    set({
      messages: [],
      streaming: false,
      streamContent: '',
      streamAgentResponse: null,
      toolStatus: null,
      error: null,
      abortFn: null,
    });
  },

  abortStream: () => {
    const abortFn = get().abortFn;
    if (abortFn) {
      abortFn();
      set({ abortFn: null });
    }
    set({ streaming: false, toolStatus: null });
  },
}));
