import { useAppStore } from '@/store/appStore';
import type { Book, BookChapter } from '@/data/bookTypes';

const getBaseUrl = () => useAppStore.getState().legadoUrl;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  if (!base) throw new Error('Chưa cấu hình địa chỉ Legado');
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Read Config ───
export interface ReadConfig {
  fontSize?: number;
  theme?: number;
  [key: string]: unknown;
}

export const getReadConfig = () => apiFetch<ReadConfig>('/getReadConfig');
export const saveReadConfig = (config: ReadConfig) =>
  apiFetch<void>('/saveReadConfig', { method: 'POST', body: JSON.stringify(config) });

// ─── Bookshelf ───
export const getBookshelf = async (translate = false): Promise<Book[]> => {
  const res = await apiFetch<{ data: Book[] } | Book[]>(`/getBookshelf?translate=${translate}`);
  return Array.isArray(res) ? res : (res as any).data ?? [];
};

// ─── Chapter list ───
export const getChapterList = async (bookUrl: string, translate = false): Promise<BookChapter[]> => {
  const res = await apiFetch<{ data: BookChapter[] } | BookChapter[]>(`/getChapterList?url=${encodeURIComponent(bookUrl)}&translate=${translate}`);
  return Array.isArray(res) ? res : (res as any).data ?? [];
};

// ─── Chapter content ───
export const getBookContent = async (bookUrl: string, index: number, translate = false, refresh = false): Promise<{ content: string, headers: Record<string, string> }> => {
  const res = await apiFetch<{ data: string, headers?: Record<string, string> } | string>(`/getBookContent?url=${encodeURIComponent(bookUrl)}&index=${index}&translate=${translate}&refresh=${refresh}`);
  if (typeof res === 'string') {
    return { content: res, headers: {} };
  }
  return {
    content: res.data ?? '',
    headers: res.headers ?? {}
  };
};

// ─── Save progress (sendBeacon on unload) ───
export interface BookProgress {
  name: string;
  author: string;
  durChapterIndex: number;
  durChapterPos: number;
  durChapterTime: number;
  durChapterTitle: string;
}

export const saveBookProgress = (progress: BookProgress) => {
  const base = getBaseUrl();
  if (!base) return;
  // Use sendBeacon for reliability on tab close
  const blob = new Blob([JSON.stringify(progress)], { type: 'application/json' });
  navigator.sendBeacon(`${base}/saveBookProgress`, blob);
};

export const saveBookProgressFetch = (progress: BookProgress) =>
  apiFetch<void>('/saveBookProgress', { method: 'POST', body: JSON.stringify(progress) });

// ─── Save / Delete book ───
export const saveBook = (book: Partial<Book>) =>
  apiFetch<void>('/saveBook', { method: 'POST', body: JSON.stringify(book) });

export const deleteBook = (book: Partial<Book>) =>
  apiFetch<void>('/deleteBook', { method: 'POST', body: JSON.stringify(book) });

// ─── WebSocket Search ───
const getWsAutoPort = () => useAppStore.getState().wsAutoPort;

const getWebSocketUrl = (baseUrl: string): string => {
  const autoPort = getWsAutoPort();

  try {
    const url = new URL(baseUrl);
    const { protocol, port } = url;

    // WebSocket port logic
    let wsPort;
    if (autoPort) {
      if (port !== '') {
        wsPort = String(Number(port) + 1);
      } else {
        wsPort = protocol.startsWith('https:') ? '444' : '81';
      }
    } else {
      // Use the same port as HTTP (for Tunnel/Proxy setups)
      wsPort = port;
    }

    const wsProtocol = protocol.startsWith('https:') ? 'wss:' : 'ws:';
    url.protocol = wsProtocol;
    if (wsPort) url.port = wsPort;

    // Ensure it ends with / for new URL() relative path resolution
    const finalUrl = url.toString();
    console.log('[LegadoAPI] WebSocket Base URL:', finalUrl);
    return finalUrl;
  } catch (err) {
    const fallback = baseUrl.replace(/^http/, 'ws');
    const finalFallback = fallback.endsWith('/') ? fallback : fallback + '/';
    console.warn('[LegadoAPI] URL construction fallback:', finalFallback, err);
    return finalFallback;
  }
};
export const createSearchSocket = (baseUrl: string): WebSocket => {
  const wsBase = getWebSocketUrl(baseUrl);
  const socketUrl = new URL('searchBook', wsBase).toString();
  console.log('[LegadoAPI] WebSocket Search URL:', socketUrl);
  return new WebSocket(socketUrl);
};

// ─── Connection test ───
export const testConnection = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(`${url}/getBookshelf`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
};

// ─── Proxy Media Stream ───
export const getProxyStreamUrl = (
  url: string,
  bookUrl: string,
  headers?: Record<string, string>
): string => {
  const base = getBaseUrl();
  if (!base) return url;
  let proxyUrl = `${base}/proxyStream?url=${encodeURIComponent(url)}&bookUrl=${encodeURIComponent(bookUrl)}`;
  if (headers) {
    Object.entries(headers).forEach(([k, v]) => {
      if (v && v.trim()) {
        proxyUrl += `&h_${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
      }
    });
  }
  return proxyUrl;
};

export interface ProxyCheckResult {
  ok: boolean;
  code: number;
  contentType: string;
  acceptRanges: string;
  body: string;
  error?: string;
}

/** Kiểm tra CDN URL có accessible không (Range:bytes=0-1) – không tải toàn bộ */
export const checkProxyUrl = async (
  videoUrl: string,
  headers?: Record<string, string>
): Promise<ProxyCheckResult> => {
  const base = getBaseUrl();
  if (!base) return { ok: false, code: 0, contentType: '', acceptRanges: '', body: '', error: 'No base URL' };

  let checkUrl = `${base}/proxyCheck?url=${encodeURIComponent(videoUrl)}`;
  if (headers) {
    Object.entries(headers).forEach(([k, v]) => {
      if (v && v.trim()) checkUrl += `&h_${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    });
  }

  try {
    const res = await fetch(checkUrl, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    if (json.isSuccess && json.data) return json.data as ProxyCheckResult;
    return { ok: false, code: 0, contentType: '', acceptRanges: '', body: '', error: json.errorMsg || 'Unknown' };
  } catch (e: any) {
    return { ok: false, code: 0, contentType: '', acceptRanges: '', body: '', error: e.message };
  }
};
