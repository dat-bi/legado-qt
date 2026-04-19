import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookshelf, useChapterList, useBookContent } from '@/hooks/useLegadoApi';
import { useAppStore } from '@/store/appStore';
import { saveBookProgress, getProxyStreamUrl } from '@/api/legadoApi';
import { BOOK_TYPES } from '@/data/bookTypes';
import { Loader2, Languages } from 'lucide-react';
import ReaderToolbar from '@/components/reader/ReaderToolbar';
import ReaderBottomBar from '@/components/reader/ReaderBottomBar';

const readerThemes = [
  { bg: 'hsl(36, 33%, 96%)', text: 'hsl(25, 20%, 16%)', name: 'Giấy', popup: 'hsl(36, 30%, 93%)' },
  { bg: 'hsl(40, 40%, 90%)', text: 'hsl(25, 25%, 18%)', name: 'Cổ điển', popup: 'hsl(40, 35%, 88%)' },
  { bg: 'hsl(120, 15%, 90%)', text: 'hsl(120, 10%, 20%)', name: 'Xanh lá', popup: 'hsl(120, 12%, 88%)' },
  { bg: 'hsl(220, 20%, 10%)', text: 'hsl(36, 20%, 85%)', name: 'Tối', popup: 'hsl(220, 18%, 14%)' },
];

export { readerThemes };

interface LoadedChapter {
  index: number;
  title: string;
  content: string;
  headers?: Record<string, string>;
}

const Reader = () => {
  const { bookUrl, chapterIndex: chapterIndexParam } = useParams();
  const navigate = useNavigate();
  const { fontSize, setFontSize, theme, setTheme, setReadingBook, translate, setTranslate, wordSpacing, setWordSpacing, paragraphSpacing, setParagraphSpacing, fontFamily, setFontFamily } = useAppStore();
  const [showToolbar, setShowToolbar] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const startChapterIndex = parseInt(chapterIndexParam || '0');
  const decodedUrl = decodeURIComponent(bookUrl || '');
  const currentTheme = readerThemes[theme] || readerThemes[0];

  const { data: books = [] } = useBookshelf();
  const book = books.find(b => b.bookUrl === decodedUrl);
  const { data: chapters = [] } = useChapterList(decodedUrl);

  const isComic = useMemo(() => {
    if (!book?.type) return false;
    return (book.type & ~BOOK_TYPES.LOCAL) === BOOK_TYPES.COMIC;
  }, [book?.type]);

  const isVideo = useMemo(() => {
    if (!book?.type) return false;
    return (book.type & ~BOOK_TYPES.LOCAL) === BOOK_TYPES.VIDEO;
  }, [book?.type]);

  const hideTranslate = isComic || isVideo;

  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([]);
  const [currentVisibleChapter, setCurrentVisibleChapter] = useState(startChapterIndex);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const chapterRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { data: initialContentData, isLoading: contentLoading } = useBookContent(decodedUrl, startChapterIndex, translate);

  useEffect(() => {
    if (initialContentData && chapters.length > 0 && !initialLoaded) {
      const ch = chapters[startChapterIndex];
      if (ch) {
        setLoadedChapters([{ index: startChapterIndex, title: ch.title, content: initialContentData.content, headers: initialContentData.headers }]);
        setInitialLoaded(true);
        setCurrentVisibleChapter(startChapterIndex);
      }
    }
  }, [initialContentData, chapters, startChapterIndex, initialLoaded]);

  useEffect(() => {
    setInitialLoaded(false);
    setLoadedChapters([]);
    chapterRefs.current.clear();
    contentRef.current?.scrollTo(0, 0);
  }, [startChapterIndex, translate]);

  const loadNextChapter = useCallback(async () => {
    if (loadingMore || loadedChapters.length === 0 || chapters.length === 0) return;
    const lastLoaded = loadedChapters[loadedChapters.length - 1];
    const nextIndex = lastLoaded.index + 1;
    if (nextIndex >= chapters.length) return;

    setLoadingMore(true);
    try {
      const { getBookContent } = await import('@/api/legadoApi');
      const data = await getBookContent(decodedUrl, nextIndex, translate);
      const ch = chapters[nextIndex];
      if (ch) {
        setLoadedChapters(prev => {
          if (prev.some(c => c.index === nextIndex)) return prev;
          return [...prev, { index: nextIndex, title: ch.title, content: data.content, headers: data.headers }];
        });
      }
    } catch (e) {
      console.error('Failed to load next chapter:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loadedChapters, chapters, decodedUrl, translate]);

  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadNextChapter(); },
      { rootMargin: '600px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextChapter]);

  useEffect(() => {
    const refs = chapterRefs.current;
    if (refs.size === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-chapter-index'));
            if (!isNaN(idx)) setCurrentVisibleChapter(idx);
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );
    refs.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loadedChapters]);

  useEffect(() => {
    if (book) {
      setReadingBook({
        bookUrl: book.bookUrl, name: book.name, author: book.author,
        chapterIndex: currentVisibleChapter, chapterPos: 0,
      });
    }
  }, [book, currentVisibleChapter]);

  useEffect(() => {
    const handleUnload = () => {
      if (book && chapters[currentVisibleChapter]) {
        saveBookProgress({
          name: book.name, author: book.author,
          durChapterIndex: currentVisibleChapter, durChapterPos: 0,
          durChapterTime: Date.now(), durChapterTitle: chapters[currentVisibleChapter].title,
        });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [book, chapters, currentVisibleChapter]);

  const goChapter = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      navigate(`/read/${encodeURIComponent(bookUrl || '')}/${index}`, { replace: true });
      setShowCatalog(false);
    }
  };

  const progressPercent = chapters.length > 0
    ? Math.round(((currentVisibleChapter + 1) / chapters.length) * 100)
    : 0;

  const toggleTranslate = () => setTranslate(!translate);

  const isImageContent = useCallback((content: string) => {
    if (isComic) return true;
    const lines = content.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return false;
    const imgLines = lines.filter(l => {
      const t = l.trim();
      return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)/i.test(t) ||
             /^<img\s/i.test(t) ||
             /src=["']https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(t);
    });
    return imgLines.length > lines.length * 0.5;
  }, [isComic]);

  const proxyImageUrl = useCallback((originalUrl: string) => {
    const base = useAppStore.getState().legadoUrl;
    if (!base || !decodedUrl) return originalUrl;
    return `${base}/image?path=${encodeURIComponent(originalUrl)}&url=${encodeURIComponent(decodedUrl)}&width=800`;
  }, [decodedUrl]);

  const isVideoContent = useCallback((content: string) => {
    if (isVideo) return true;
    return /bilibili\.com|youtube\.com|youtu\.be|<video|<iframe|\.mp4|\.m3u8/i.test(content);
  }, [isVideo]);

  const extractVideoUrl = useCallback((content: string): { type: 'bilibili' | 'youtube' | 'direct' | 'iframe'; url: string } | null => {
    const trimmed = content.trim();
    const bvMatch = trimmed.match(/BV[\w]+/i) || trimmed.match(/bilibili\.com\/video\/(BV[\w]+)/i);
    if (bvMatch) return { type: 'bilibili', url: `https://player.bilibili.com/player.html?bvid=${bvMatch[0]}&autoplay=0` };
    const avMatch = trimmed.match(/aid[=:]?\s*(\d+)/i) || trimmed.match(/av(\d+)/i);
    if (avMatch) return { type: 'bilibili', url: `https://player.bilibili.com/player.html?aid=${avMatch[1]}&autoplay=0` };
    const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return { type: 'youtube', url: `https://www.youtube.com/embed/${ytMatch[1]}` };

    // Direct video link or m3u8
    const videoRegex = /(https?:\/\/[^\s"'<>]+?\.(?:mp4|webm|m3u8|mov|avi|flv)(?:\?[^\s"'<>]*)?)/i;
    const directMatch = trimmed.match(videoRegex);
    if (directMatch) return { type: 'direct', url: directMatch[1] };

    // If it's a video book and it starts with http, treat it as a direct link
    if (isVideo && /^https?:\/\/[^\s"'<>]+$/i.test(trimmed)) {
      return { type: 'direct', url: trimmed };
    }

    const iframeMatch = trimmed.match(/src=["'](https?:\/\/[^"']+)["']/i);
    if (iframeMatch) return { type: 'iframe', url: iframeMatch[1] };
    return null;
  }, [isVideo]);

  const renderChapterContent = useCallback((content: string) => {
    if (isVideoContent(content)) {
      const videoInfo = extractVideoUrl(content);
      if (videoInfo) {
        if (videoInfo.type === 'direct') {
          return (
            <div className="flex flex-col items-center">
              <video src={getProxyStreamUrl(videoInfo.url, decodedUrl)} controls className="w-full max-w-3xl rounded-xl shadow-lg" style={{ maxHeight: '80vh' }} />
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-3xl rounded-xl overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={videoInfo.url}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
              />
            </div>
          </div>
        );
      }
    }

    if (isImageContent(content)) {
      const urls: string[] = [];
      const urlMatches = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|bmp)(\?[^\s"'<>]*)?/gi);
      if (urlMatches) urls.push(...urlMatches);
      const srcMatches = content.match(/src=["'](https?:\/\/[^"']+)["']/gi);
      if (srcMatches) {
        srcMatches.forEach(m => {
          const url = m.replace(/^src=["']|["']$/g, '');
          if (!urls.includes(url)) urls.push(url);
        });
      }
      if (urls.length > 0) {
        return (
          <div className="flex flex-col items-center gap-1">
            {urls.map((url, i) => (
              <img key={i} src={proxyImageUrl(url)} alt={`Page ${i + 1}`} className="w-full max-w-2xl rounded shadow-sm" loading="lazy" style={{ minHeight: 200 }} />
            ))}
          </div>
        );
      }
    }

    return (
      <div
        className="leading-[1.95] text-justify tracking-wide reader-content"
        style={{
          fontFamily: fontFamily === 'system-ui' ? 'system-ui, sans-serif' : `'${fontFamily}', serif`,
          wordSpacing: `${wordSpacing}px`,
          letterSpacing: `${wordSpacing * 0.3}px`,
        }}
        dangerouslySetInnerHTML={{ __html: postProcessContent(content.replace(/<br\s*\/?>|\n/g, "<br>")) }}
      />
    );
  }, [isImageContent, isVideoContent, extractVideoUrl, proxyImageUrl, fontFamily, wordSpacing]);

  /**
   * Xử lý HTML từ Legado: tìm các thẻ <img> là icon bình luận (đoạn bình)
   * có src dạng "data:image/svg+xml;base64,...,{"click":"showCmt('URL',...)"}" bị HTML-escape,
   * rồi bọc chúng bằng <a href="commentUrl" target="_blank"> để click mở tab mới.
   */
  const postProcessContent = useCallback((html: string): string => {
    return html.replace(
      /<img\s[^>]*>/gi,
      (imgTag) => {
        // Decode HTML entities trong tag
        const decoded = imgTag
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'");

        // Chỉ xử lý nếu là comment icon (chứa showCmt hoặc pattern click)
        if (!decoded.includes('showCmt') && !decoded.includes('"click"')) {
          return imgTag;
        }

        // Trích xuất URL bình luận từ showCmt('URL', ...)
        const urlMatch = decoded.match(/showCmt\s*\(\s*['"]([^'"]+)['"]/);
        if (!urlMatch) return imgTag;
        const commentUrl = urlMatch[1];

        // Trích xuất data URI SVG, bỏ phần JSON thừa phía sau
        const srcMatch = decoded.match(/src="([^"]+)"/);
        if (!srcMatch) return imgTag;
        const dataUri = srcMatch[1].replace(/\s*,\s*\{.*$/, '').trim();

        return `<a href="${commentUrl}" target="_blank" rel="noopener noreferrer"` +
          ` title="Xem bình luận"` +
          ` style="display:inline-block;cursor:pointer;vertical-align:middle;text-decoration:none;"` +
          ` onclick="event.stopPropagation()">` +
          `<img src="${dataUri}" style="width:40px;height:auto;vertical-align:middle;" />` +
          `</a>`;
      }
    );
  }, []);

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy nội dung.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative transition-colors duration-500" style={{ background: currentTheme.bg, color: currentTheme.text }}>
      <style>{`.reader-content p { margin-bottom: ${paragraphSpacing}px; }`}</style>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full h-[3px] z-50" style={{ background: `${currentTheme.text}06` }}>
        <div className="h-full rounded-r-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%`, background: `hsl(var(--warm-gold))` }} />
      </div>

      <ReaderToolbar
        show={showToolbar} showCatalog={showCatalog} showSettings={showSettings}
        setShowCatalog={setShowCatalog} setShowSettings={setShowSettings}
        currentTheme={currentTheme} chapter={chapters[currentVisibleChapter]}
        chapters={chapters} chapterIndex={currentVisibleChapter} book={book}
        fontSize={fontSize} setFontSize={setFontSize} theme={theme} setTheme={setTheme}
        goChapter={goChapter}
        onBack={() => navigate(`/book/${encodeURIComponent(book.bookUrl)}`)}
        translate={translate} onToggleTranslate={toggleTranslate} hideTranslate={hideTranslate}
        wordSpacing={wordSpacing} setWordSpacing={setWordSpacing}
        paragraphSpacing={paragraphSpacing} setParagraphSpacing={setParagraphSpacing}
        fontFamily={fontFamily} setFontFamily={setFontFamily}
      />

      <ReaderBottomBar
        show={showToolbar} currentTheme={currentTheme}
        chapterIndex={currentVisibleChapter} totalChapters={chapters.length}
        goChapter={goChapter}
      />

      {/* Reading content */}
      <div
        ref={contentRef}
        className="mx-auto min-h-screen px-5 md:px-10 pt-10 pb-24 max-w-3xl cursor-pointer select-text"
        onClick={() => { setShowToolbar(!showToolbar); setShowCatalog(false); setShowSettings(false); }}
        style={{ fontSize: `${fontSize}px` }}
      >
        {contentLoading && loadedChapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-7 h-7 animate-spin opacity-40" />
            <span className="text-sm opacity-40">Đang tải...</span>
          </div>
        ) : (
          <>
            {loadedChapters.map((lc) => (
              <div
                key={lc.index}
                ref={(el) => { if (el) chapterRefs.current.set(lc.index, el); }}
                data-chapter-index={lc.index}
                className="mb-16"
              >
                {lc.index !== loadedChapters[0]?.index && (
                  <div className="flex items-center gap-4 mb-10 mt-4">
                    <div className="flex-1 h-px" style={{ background: `${currentTheme.text}10` }} />
                    <span className="text-xs font-medium tracking-wider uppercase opacity-25">Chương {lc.index + 1}</span>
                    <div className="flex-1 h-px" style={{ background: `${currentTheme.text}10` }} />
                  </div>
                )}

                <h2 className="text-xl md:text-2xl font-bold font-serif mb-8 leading-tight opacity-85">
                  {lc.title}
                </h2>

                {renderChapterContent(lc.content)}
              </div>
            ))}

            {loadingMore && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin opacity-30" />
              </div>
            )}

            <div ref={bottomSentinelRef} className="h-1" />

            {loadedChapters.length > 0 && loadedChapters[loadedChapters.length - 1].index >= chapters.length - 1 && (
              <div className="text-center py-16 opacity-30">
                <p className="text-sm font-medium">— Hết —</p>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default Reader;
