import axios, { AxiosError, AxiosResponse } from 'axios';
import type { ApiResponse } from '../types';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const message = error.response?.data?.message || error.message || '请求失败';
    return Promise.reject({
      code: error.response?.data?.code || 1,
      message,
      data: error.response?.data?.data,
    });
  }
);

export default client;

/** 创建 SSE 连接（基于 fetch，不自动重连） */
export function createSSEConnection(
  url: string,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  onDone: () => void,
): { abort: () => void } {
  const controller = new AbortController();
  let aborted = false;

  (async () => {
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok || !response.body) {
        onDone();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done || aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(currentEvent, data);
              if (currentEvent === 'done') {
                reader.cancel();
                onDone();
                return;
              }
            } catch {
              onEvent(currentEvent, { raw: line.slice(6) });
            }
          }
        }
      }
    } catch {
      // aborted or network error
    } finally {
      onDone();
    }
  })();

  return {
    abort: () => {
      aborted = true;
      controller.abort();
    },
  };
}
