import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book, BookChapter } from '@/data/bookTypes';

interface ReadingBook {
  bookUrl: string;
  name: string;
  author: string;
  chapterIndex: number;
  chapterPos: number;
}

interface AppState {
  // Connection
  legadoUrl: string;
  wsAutoPort: boolean;
  isConnected: boolean;
  setLegadoUrl: (url: string) => void;
  setWsAutoPort: (auto: boolean) => void;
  setConnected: (connected: boolean) => void;
  
  // Reading
  readingBook: ReadingBook | null;
  setReadingBook: (book: ReadingBook) => void;
  
  // View preferences
  isGridView: boolean;
  setGridView: (grid: boolean) => void;
  gridColumns: number;
  setGridColumns: (cols: number) => void;
  sortMode: 'recent' | 'reading' | 'name';
  setSortMode: (mode: 'recent' | 'reading' | 'name') => void;
  
  // Reader settings
  fontSize: number;
  setFontSize: (size: number) => void;
  theme: number;
  setTheme: (theme: number) => void;
  translate: boolean;
  setTranslate: (t: boolean) => void;
  wordSpacing: number;
  setWordSpacing: (s: number) => void;
  paragraphSpacing: number;
  setParagraphSpacing: (s: number) => void;
  fontFamily: string;
  setFontFamily: (f: string) => void;

  // Dark mode
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      legadoUrl: window.location.origin,
      wsAutoPort: true,
      isConnected: true,
      setLegadoUrl: (url) => set({ legadoUrl: url }),
      setWsAutoPort: (auto) => set({ wsAutoPort: auto }),
      setConnected: (connected) => set({ isConnected: connected }),
      
      readingBook: null,
      setReadingBook: (book) => set({ readingBook: book }),
      
      isGridView: true,
      setGridView: (grid) => set({ isGridView: grid }),
      gridColumns: 0,
      setGridColumns: (cols) => set({ gridColumns: cols }),
      sortMode: 'recent',
      setSortMode: (mode) => set({ sortMode: mode }),
      
      fontSize: 18,
      setFontSize: (size) => set({ fontSize: size }),
      theme: 0,
      setTheme: (theme) => set({ theme: theme }),
      translate: true,
      setTranslate: (t) => set({ translate: t }),
      wordSpacing: 0,
      setWordSpacing: (s) => set({ wordSpacing: s }),
      paragraphSpacing: 16,
      setParagraphSpacing: (s) => set({ paragraphSpacing: s }),
      fontFamily: 'Lora',
      setFontFamily: (f) => set({ fontFamily: f }),

      darkMode: false,
      setDarkMode: (dark) => set({ darkMode: dark }),
    }),
    {
      name: 'legado-app-store',
    }
  )
);
