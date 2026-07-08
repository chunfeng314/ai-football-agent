import { create } from 'zustand';
import { createSSEConnection } from '../api/client';
import client from '../api/client';
import type { ChatMessage, AgentResponse } from '../types';

interface ChatState {
  messages: ChatMessage[];
  streaming: boolean;
  streamContent: string;
  streamAgentResponse: AgentResponse | null;
  toolStatus: string | null;
  error: string | null;
  abortFn: (() => void) | null;
  threadId: string;
  threads: { thread_id: string; message_count: number; last_message: string }[];

  sendMessage: (text: string) => void;
  clearChat: () => void;
  abortStream: () => void;
  newThread: () => void;
  switchThread: (threadId: string) => void;
  loadThreads: () => Promise<void>;
}

let msgId = 0;
function nextId() {
  return `msg-${++msgId}-${Date.now()}`;
}

function genThreadId() {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 从 localStorage 恢复 threadId
function getStoredThreadId(): string {
  try {
    return localStorage.getItem('chat_thread_id') || genThreadId();
  } catch { return genThreadId(); }
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  streaming: false,
  streamContent: '',
  streamAgentResponse: null,
  toolStatus: null,
  error: null,
  abortFn: null,
  threadId: getStoredThreadId(),
  threads: [],

  sendMessage: (text: string) => {
    const oldAbort = get().abortFn;
    if (oldAbort) { oldAbort(); set({ abortFn: null }); }

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

    const threadId = get().threadId;
    const conn = createSSEConnection(
      `/api/chat/stream?message=${encodeURIComponent(text)}&thread_id=${threadId}`,
      (event, data) => {
        set((s) => {
          if (!s.streaming) return {};
          switch (event) {
            case 'thinking': return { toolStatus: '分析中...' };
            case 'tool_start': return { toolStatus: `查询: ${data.tool || ''}` };
            case 'tool_end': return { toolStatus: '分析数据中...' };
            case 'token': return { streamContent: s.streamContent + ((data.content as string) || '') };
            case 'structured': return { streamAgentResponse: data.response as AgentResponse };
            default: return {};
          }
        });
      },
      () => {
        set((s) => {
          if (!s.streaming) return {};
          const assistantMsg: ChatMessage = {
            id: nextId(),
            role: 'assistant',
            content: s.streamContent,
            agentResponse: s.streamAgentResponse || undefined,
            timestamp: new Date().toISOString(),
          };
          const newMessages = [...s.messages, assistantMsg];
          // 持久化到 localStorage
          try { localStorage.setItem(`chat_${s.threadId}`, JSON.stringify(newMessages)); } catch {}
          return {
            messages: newMessages,
            streaming: false, streamContent: '', toolStatus: null, abortFn: null,
          };
        });
      }
    );
    set({ abortFn: conn.abort });
  },

  clearChat: () => {
    const abortFn = get().abortFn;
    if (abortFn) abortFn();
    const threadId = get().threadId;
    try { localStorage.removeItem(`chat_${threadId}`); } catch {}
    set({
      messages: [], streaming: false, streamContent: '',
      streamAgentResponse: null, toolStatus: null, error: null, abortFn: null,
    });
  },

  abortStream: () => {
    const abortFn = get().abortFn;
    if (abortFn) { abortFn(); set({ abortFn: null }); }
    set({ streaming: false, toolStatus: null });
  },

  newThread: () => {
    const abortFn = get().abortFn;
    if (abortFn) abortFn();
    const newId = genThreadId();
    localStorage.setItem('chat_thread_id', newId);
    try { localStorage.setItem(`chat_${newId}`, '[]'); } catch {}
    set({ threadId: newId, messages: [], streaming: false, abortFn: null });
  },

  switchThread: (threadId: string) => {
    const abortFn = get().abortFn;
    if (abortFn) abortFn();
    localStorage.setItem('chat_thread_id', threadId);
    // 从 localStorage 加载
    let msgs: ChatMessage[] = [];
    try { msgs = JSON.parse(localStorage.getItem(`chat_${threadId}`) || '[]'); } catch {}
    set({ threadId, messages: msgs, streaming: false, abortFn: null });
  },

  loadThreads: async () => {
    try {
      const res = await client.get('/chat/threads');
      set({ threads: res.data.data || [] });
    } catch { /* ignore */ }
  },
}));
