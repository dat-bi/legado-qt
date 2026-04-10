import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookshelf, useChapterList } from '@/hooks/useLegadoApi';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, BookOpen, Layers, ChevronRight, Loader2, Play, Search, Globe, Clock, BookMarked, Hash, User, Tag } from 'lucide-react';
import TranslateToggle from '@/components/TranslateToggle';
import DarkModeToggle from '@/components/DarkModeToggle';
import { getBookTypeInfo, BOOK_TYPES } from '@/data/mockBooks';
import { defaultCover } from '@/assets/default-cover';

const BookDetail = () => {
  const { bookUrl } = useParams();
  const navigate = useNavigate();
  const { setReadingBook, translate } = useAppStore();
  const unknownAuthor = translate ? 'Không rõ' : '不详';
  const decodedUrl = decodeURIComponent(bookUrl || '');
  const [chapterSearch, setChapterSearch] = useState('');
  const [reverseChapters, setReverseChapters] = useState(false);

  const { data: books = [] } = useBookshelf();
  const book = books.find(b => b.bookUrl === decodedUrl);
  const { data: chapters = [], isLoading: chaptersLoading } = useChapterList(decodedUrl);

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy sách.</p>
      </div>
    );
  }

  const baseType = (book.type ?? 0) & ~BOOK_TYPES.LOCAL;
  const hideTranslate = baseType === BOOK_TYPES.COMIC || baseType === BOOK_TYPES.VIDEO;
  const typeInfo = getBookTypeInfo(book.type);

  const progress = book.totalChapterNum > 0
    ? Math.round((book.durChapterIndex / book.totalChapterNum) * 100)
    : 0;

  const handleReadChapter = (index: number) => {
    setReadingBook({
      bookUrl: book.bookUrl,
      name: book.name,
      author: book.author,
      chapterIndex: index,
      chapterPos: 0,
    });
    navigate(`/read/${encodeURIComponent(book.bookUrl)}/${index}`);
  };

  const handleContinueReading = () => {
    handleReadChapter(book.durChapterIndex > 0 ? book.durChapterIndex : 0);
  };

  const displayedChapters = (() => {
    let list = [...chapters];
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase();
      list = list.filter(ch => ch.title.toLowerCase().includes(q));
    }
    if (reverseChapters) list.reverse();
    return list;
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative bg-card border-b border-border overflow-hidden">
        {/* Blurred bg */}
        <div className="absolute inset-0 opacity-10">
          <img
            src={book.coverUrl || defaultCover}
            className="w-full h-full object-cover blur-3xl scale-150"
            onError={(e) => { (e.target as HTMLImageElement).src = defaultCover; }}
          />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-4 sm:pb-6">
          {/* Nav */}
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Kệ sách</span>
            </button>
            <div className="flex items-center gap-1">
              {!hideTranslate && <TranslateToggle size="sm" />}
              <DarkModeToggle size="sm" />
            </div>
          </div>

          <div className="flex gap-3 sm:gap-5 md:gap-6">
            {/* Cover */}
            <div className="w-20 sm:w-28 md:w-36 flex-shrink-0">
              <div className="aspect-[3/4] rounded-lg sm:rounded-xl overflow-hidden shadow-xl ring-1 ring-border/50">
                <img
                  src={book.coverUrl || defaultCover}
                  alt={book.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = defaultCover; }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 flex-wrap">
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold ${typeInfo.color}`}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                </div>

                <h1 className="text-base sm:text-xl md:text-2xl font-bold font-serif text-foreground leading-tight mb-0.5 sm:mb-1 line-clamp-2">
                  {book.name}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-2 sm:mb-3 truncate flex items-center gap-1">
                  <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />{book.author || unknownAuthor}
                </p>

                {book.kind && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                    {book.kind?.split(',').filter(t => t.trim()).slice(0, 3).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/8 text-primary text-[9px] sm:text-[11px] font-medium">
                        <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-x-4 text-[10px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{book.totalChapterNum} chương</span>
                  {book.wordCount && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{book.wordCount}</span>}
                  {book.originName && <span className="flex items-center gap-1"><Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{book.originName}</span>}
                </div>
              </div>

              {/* Progress + CTA */}
              <div className="mt-2.5 sm:mt-4">
                {progress > 0 && (
                  <div className="mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground mb-1">
                      <span>Tiến độ</span>
                      <div className="w-24 sm:w-32 bg-muted h-1 sm:h-1.5 rounded-full overflow-hidden">
                        <div className="bg-warm-gold h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="font-medium">{progress}%</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleContinueReading}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-opacity text-xs sm:text-sm shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {progress > 0 ? `Đọc tiếp ch. ${book.durChapterIndex + 1}` : 'Bắt đầu đọc'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Reading status */}
        {(book.durChapterTitle || book.latestChapterTitle) && (
          <div className="mb-4 sm:mb-6 bg-card rounded-xl border border-border p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {book.durChapterTitle && (
              <div>
                <h3 className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <BookMarked className="w-3 h-3" /> Đang đọc
                </h3>
                <p className="text-xs sm:text-sm text-foreground line-clamp-1">{book.durChapterTitle}</p>
              </div>
            )}
            {book.latestChapterTitle && (
              <div>
                <h3 className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Chương mới nhất
                </h3>
                <p className="text-xs sm:text-sm text-foreground line-clamp-1">{book.latestChapterTitle}</p>
              </div>
            )}
          </div>
        )}

        {/* Intro */}
        {book.intro && (
          <div className="mb-4 sm:mb-6 bg-card rounded-xl border border-border p-3 sm:p-4">
            <h2 className="text-xs sm:text-sm font-semibold font-serif mb-1.5 sm:mb-2 text-foreground">Giới thiệu</h2>
            <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm whitespace-pre-line line-clamp-[12]">{book.intro}</p>
          </div>
        )}

        {/* Chapter list */}
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-xs sm:text-sm font-semibold font-serif flex items-center gap-1.5 sm:gap-2 text-foreground">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Mục lục ({chapters.length})
            </h2>
            <button
              onClick={() => setReverseChapters(!reverseChapters)}
              className="text-[10px] sm:text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
            >
              {reverseChapters ? '↑ Cũ → Mới' : '↓ Mới → Cũ'}
            </button>
          </div>

          {/* Chapter search */}
          <div className="relative mb-2 sm:mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm chương..."
              value={chapterSearch}
              onChange={(e) => setChapterSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg bg-secondary text-xs sm:text-sm border border-transparent focus:border-primary/30 focus:outline-none placeholder:text-muted-foreground transition-all"
            />
          </div>

          {chaptersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden max-h-[60vh] overflow-y-auto custom-scrollbar">
              {displayedChapters.map((chapter) => (
                <button
                  key={chapter.index}
                  onClick={() => handleReadChapter(chapter.index)}
                  className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between hover:bg-secondary/50 transition-colors group ${
                    chapter.index === book.durChapterIndex ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground w-6 sm:w-8 flex-shrink-0 text-right font-mono">
                      {chapter.index + 1}
                    </span>
                    <span className={`text-xs sm:text-sm truncate ${
                      chapter.index === book.durChapterIndex ? 'text-primary font-semibold' : 'text-card-foreground'
                    }`}>
                      {chapter.title}
                    </span>
                  </div>
                  {chapter.index === book.durChapterIndex && (
                    <span className="text-[8px] sm:text-[9px] text-primary bg-primary/10 px-1 sm:px-1.5 py-0.5 rounded font-medium flex-shrink-0 ml-1.5">
                      Đang đọc
                    </span>
                  )}
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
