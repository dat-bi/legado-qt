export interface Book {
  bookUrl: string;
  name: string;
  author: string;
  coverUrl: string;
  intro: string;
  kind: string;
  wordCount: string;
  originName: string;
  origin?: string;
  totalChapterNum: number;
  durChapterIndex: number;
  durChapterTitle: string;
  durChapterPos?: number;
  durChapterTime: number;
  latestChapterTitle: string;
  latestChapterTime?: number;
  lastCheckCount: number;
  lastCheckTime: number;
  type?: number;
  group?: number;
  order?: number;
  canUpdate?: boolean;
  tocUrl?: string;
  charset?: string;
  variable?: string;
  syncTime?: number;
  readConfig?: Record<string, unknown>;
}

/** Book type utilities */
export const BOOK_TYPES = {
  VIDEO: 4,
  TEXT: 8,
  AUDIO: 32,
  COMIC: 64,
  LOCAL: 256,
} as const;

export function getBookTypeInfo(type?: number): { label: string; icon: string; color: string } {
  if (!type) return { label: 'Sách', icon: '📖', color: 'bg-primary/10 text-primary' };
  
  const isLocal = (type & BOOK_TYPES.LOCAL) !== 0;
  const baseType = type & ~BOOK_TYPES.LOCAL;
  
  const prefix = isLocal ? '📁 ' : '';
  
  if (baseType === BOOK_TYPES.VIDEO || type === BOOK_TYPES.VIDEO) {
    return { label: `${prefix}Video`, icon: '🎬', color: 'bg-red-500/10 text-red-600' };
  }
  if (baseType === BOOK_TYPES.COMIC || type === BOOK_TYPES.COMIC) {
    return { label: `${prefix}Truyện tranh`, icon: '🖼️', color: 'bg-purple-500/10 text-purple-600' };
  }
  if (baseType === BOOK_TYPES.AUDIO || type === BOOK_TYPES.AUDIO) {
    return { label: `${prefix}Sách nói`, icon: '🎧', color: 'bg-blue-500/10 text-blue-600' };
  }
  if (baseType === BOOK_TYPES.TEXT || type === BOOK_TYPES.TEXT) {
    return { label: `${prefix}Truyện chữ`, icon: '📖', color: 'bg-primary/10 text-primary' };
  }
  
  return { label: isLocal ? '📁 Cục bộ' : 'Sách', icon: '📖', color: 'bg-primary/10 text-primary' };
}

export interface BookChapter {
  index: number;
  title: string;
  bookUrl: string;
  url: string;
}
