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

/** 创建 SSE 连接 */
export function createSSEConnection(
  url: string,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  onError?: (error: Event) => void
): EventSource {
  // SSE 需要携带 API key，通过 URL 参数传递
  const es = new EventSource(url);

  const eventTypes = ['thinking', 'tool_start', 'tool_end', 'token', 'structured', 'done'];
  eventTypes.forEach((evt) => {
    es.addEventListener(evt, (e: MessageEvent) => {
      try {
        onEvent(evt, JSON.parse(e.data));
      } catch {
        onEvent(evt, { raw: e.data });
      }
    });
  });

  es.onerror = onError || null;
  return es;
}
