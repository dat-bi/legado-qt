import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book } from '@/data/bookTypes';
import { BOOK_TYPES, getBookTypeInfo } from '@/data/bookTypes';
import { useAppStore } from '@/store/appStore';
import { useBookshelf } from '@/hooks/useLegadoApi';
import {
  BookOpen, Search, Grid3X3, List, Settings, ArrowUpDown, Loader2,
  Globe, Columns3, Minus, Plus, Library, RefreshCw
} from 'lucide-react';
import BookCard from '@/components/BookCard';
import TranslateToggle from '@/components/TranslateToggle';
import DarkModeToggle from '@/components/DarkModeToggle';

const sortLabels = { recent: 'Mới cập nhật', reading: 'Đang đọc', name: 'Tên sách' };

const typeFilters = [
  { value: 'all', label: 'Tất cả', icon: '📚' },
  { value: 'text', label: 'Truyện chữ', icon: '📖' },
  { value: 'comic', label: 'Truyện tranh', icon: '🖼️' },
  { value: 'audio', label: 'Truyện nói', icon: '🎧' },
  { value: 'video', label: 'Video', icon: '🎬' },
];

const BookShelf = () => {
  const navigate = useNavigate();
  const { isGridView, setGridView, sortMode, setSortMode, readingBook, gridColumns, setGridColumns } = useAppStore();
  const [searchWord, setSearchWord] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: books = [], isLoading, isError, refetch } = useBookshelf();

  const filteredBooks = useMemo(() => {
    let list = Array.isArray(books) ? [...books] : [];
    
    if (typeFilter !== 'all') {
      list = list.filter(b => {
        const baseType = (b.type ?? 0) & ~BOOK_TYPES.LOCAL;
        switch (typeFilter) {
          case 'text': return baseType === BOOK_TYPES.TEXT;
          case 'comic': return baseType === BOOK_TYPES.COMIC;
          case 'audio': return baseType === BOOK_TYPES.AUDIO;
          case 'video': return baseType === BOOK_TYPES.VIDEO;
          default: return true;
        }
      });
    }

    if (searchWord.trim()) {
      const q = searchWord.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    switch (sortMode) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'reading': list.sort((a, b) => b.durChapterIndex - a.durChapterIndex); break;
      default: list.sort((a, b) => b.durChapterTime - a.durChapterTime);
    }
    return list;
  }, [books, searchWord, sortMode, typeFilter]);

  const typeCounts = useMemo(() => {
    const arr = Array.isArray(books) ? books : [];
    const counts: Record<string, number> = { all: arr.length, text: 0, comic: 0, audio: 0, video: 0 };
    arr.forEach(b => {
      const bt = (b.type ?? 0) & ~BOOK_TYPES.LOCAL;
      if (bt === BOOK_TYPES.TEXT) counts.text++;
      else if (bt === BOOK_TYPES.COMIC) counts.comic++;
      else if (bt === BOOK_TYPES.AUDIO) counts.audio++;
      else if (bt === BOOK_TYPES.VIDEO) counts.video++;
    });
    return counts;
  }, [books]);

  const handleBookClick = (book: Book) => {
    navigate(`/book/${encodeURIComponent(book.bookUrl)}`);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          {/* Top row */}
          <div className="flex items-center h-12 sm:h-14 gap-2">
            {/* Left: icon + count */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Library className="w-5 h-5 text-primary" />
              <h1 className="text-base sm:text-lg font-bold font-serif text-foreground hidden sm:block">Kệ sách</h1>
              <span className="text-[10px] sm:text-xs text-muted-foreground bg-secondary px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                {filteredBooks.length}
              </span>
            </div>

            {/* Search - flexible width */}
            <div className="flex-1 min-w-0 mx-1 sm:mx-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-secondary text-xs sm:text-sm border border-transparent focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <TranslateToggle size="sm" />
              <DarkModeToggle size="sm" />

              <button
                onClick={() => refetch()}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Làm mới"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => navigate('/search')}
                className="w-7 h-7 sm:w-8 sm:h-8 items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground hidden sm:flex"
                title="Tìm sách online"
              >
                <Globe className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Cài đặt"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Filter & controls row */}
          <div className="flex items-center justify-between gap-2 pb-2 -mt-0.5">
            {/* Type filter tabs - scrollable on mobile */}
            <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
              {typeFilters.map(tf => {
                const count = typeCounts[tf.value] || 0;
                if (tf.value !== 'all' && count === 0) return null;
                return (
                  <button
                    key={tf.value}
                    onClick={() => setTypeFilter(tf.value)}
                    className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      typeFilter === tf.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span className="hidden sm:inline">{tf.icon}</span>
                    <span>{tf.label}</span>
                    <span className={`text-[9px] ${typeFilter === tf.value ? 'opacity-80' : 'opacity-50'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Column adjuster - hidden on small mobile */}
              {isGridView && (
                <div className="relative hidden sm:block">
                  <button
                    className="h-7 sm:h-8 px-2 rounded-lg bg-secondary hover:bg-accent transition-colors flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setColsOpen(!colsOpen)}
                    title="Số cột"
                  >
                    <Columns3 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">{gridColumns || 'A'}</span>
                  </button>
                  {colsOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setColsOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl p-3 z-20 min-w-[150px]">
                        <p className="text-[11px] text-muted-foreground mb-2 font-medium">Số cột</p>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => setGridColumns(Math.max(0, (gridColumns || 4) - 1))}
                            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold flex-1 text-center">{gridColumns || 'Auto'}</span>
                          <button
                            onClick={() => setGridColumns(Math.min(8, (gridColumns || 4) + 1))}
                            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[0, 2, 3, 4, 5, 6].map(n => (
                            <button
                              key={n}
                              onClick={() => { setGridColumns(n); setColsOpen(false); }}
                              className={`px-2 py-1 rounded-md text-xs transition-colors ${gridColumns === n ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'}`}
                            >
                              {n === 0 ? 'Auto' : n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Grid/List toggle */}
              <div className="flex bg-secondary rounded-md sm:rounded-lg p-0.5">
                <button
                  className={`p-1 sm:p-1.5 rounded transition-all ${isGridView ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setGridView(true)}
                >
                  <Grid3X3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  className={`p-1 sm:p-1.5 rounded transition-all ${!isGridView ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setGridView(false)}
                >
                  <List className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

              {/* Sort */}
              <div className="relative">
                <button
                  className="h-7 sm:h-8 px-2 bg-secondary rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium flex items-center gap-1 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  onClick={() => setSortOpen(!sortOpen)}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span className="hidden sm:inline">{sortLabels[sortMode]}</span>
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 z-20 min-w-[140px]">
                      {(['recent', 'reading', 'name'] as const).map(mode => (
                        <button
                          key={mode}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${sortMode === mode ? 'text-primary font-medium' : 'text-foreground'}`}
                          onClick={() => { setSortMode(mode); setSortOpen(false); }}
                        >
                          {sortLabels[mode]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Continue reading banner */}
      {readingBook && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
          <button
            onClick={() => navigate(`/read/${encodeURIComponent(readingBook.bookUrl)}/${readingBook.chapterIndex}`)}
            className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-primary/8 border border-primary/15 hover:bg-primary/12 transition-colors group"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Đọc tiếp</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {readingBook.name}
              </p>
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
              Ch. {readingBook.chapterIndex + 1}
            </span>
          </button>
        </div>
      )}

      {/* Books grid */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pb-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang tải kệ sách...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-destructive/60" />
            </div>
            <p className="text-base sm:text-lg font-semibold font-serif text-foreground mb-1">Lỗi kết nối</p>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">Không thể tải kệ sách. Kiểm tra kết nối Legado.</p>
            <button
              onClick={() => navigate('/settings')}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Cài đặt kết nối
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/40" />
            </div>
            <p className="text-base sm:text-lg font-semibold font-serif text-foreground mb-1">
              {searchWord ? 'Không tìm thấy' : 'Kệ sách trống'}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
              {searchWord ? 'Thử tìm với từ khóa khác' : 'Tìm kiếm hoặc thêm sách để bắt đầu đọc.'}
            </p>
          </div>
        ) : isGridView ? (
          <div
            className="grid gap-2.5 sm:gap-4 pt-3 sm:pt-4"
            style={{
              gridTemplateColumns: gridColumns > 0
                ? `repeat(${gridColumns}, minmax(0, 1fr))`
                : 'repeat(auto-fill, minmax(110px, 1fr))'
            }}
          >
            {filteredBooks.map((book, i) => (
              <BookCard key={book.bookUrl} book={book} isGridView onClick={handleBookClick} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-2.5 pt-3 sm:pt-4">
            {filteredBooks.map((book, i) => (
              <BookCard key={book.bookUrl} book={book} isGridView={false} onClick={handleBookClick} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BookShelf;
