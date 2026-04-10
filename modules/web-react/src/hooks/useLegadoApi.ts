import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import { getBookshelf, getChapterList, getBookContent, getReadConfig } from '@/api/legadoApi';
import { mockBooks, mockChapters, mockChapterContent } from '@/data/mockBooks';

const useLegadoConnected = () => {
  const { legadoUrl, isConnected } = useAppStore();
  return legadoUrl && isConnected;
};

export const useBookshelf = () => {
  const connected = useLegadoConnected();
  const translate = useAppStore(s => s.translate);
  return useQuery({
    queryKey: ['bookshelf', connected, translate],
    queryFn: async () => {
      if (!connected) return mockBooks;
      const data = await getBookshelf(translate);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
  });
};

export const useChapterList = (bookUrl: string) => {
  const connected = useLegadoConnected();
  const translate = useAppStore(s => s.translate);
  return useQuery({
    queryKey: ['chapters', bookUrl, connected, translate],
    queryFn: () => (connected ? getChapterList(bookUrl, translate) : Promise.resolve(mockChapters)),
    enabled: !!bookUrl,
    staleTime: 60_000,
  });
};

export const useBookContent = (bookUrl: string, index: number, translate = false) => {
  const connected = useLegadoConnected();
  return useQuery({
    queryKey: ['content', bookUrl, index, connected, translate],
    queryFn: () => (connected ? getBookContent(bookUrl, index, translate) : Promise.resolve(mockChapterContent)),
    enabled: !!bookUrl && index >= 0,
    staleTime: 300_000,
  });
};

export const useReadConfig = () => {
  const connected = useLegadoConnected();
  return useQuery({
    queryKey: ['readConfig', connected],
    queryFn: () => (connected ? getReadConfig() : Promise.resolve(null)),
    enabled: !!connected,
  });
};
