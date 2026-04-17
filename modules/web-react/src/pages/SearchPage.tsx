import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { createSearchSocket, saveBook } from '@/api/legadoApi';
import type { Book } from '@/data/bookTypes';
import { defaultCover } from '@/assets/default-cover';
import { ArrowLeft, Search, Loader2, Plus, BookOpen, Check } from 'lucide-react';
import { toast } from 'sonner';

const SearchPage = () => {
  const navigate = useNavigate();
  const { legadoUrl, isConnected, translate } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  const cleanup = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const handleSearch = () => {
    if (!query.trim() || !isConnected || !legadoUrl) return;
    cleanup();
    setResults([]);
    setSearching(true);

    const ws = createSearchSocket(legadoUrl);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ 
      key: query.trim(), 
      translate: translate ? 'true' : 'false' 
    }));

    ws.onmessage = (e) => {
      console.log('[Search] Message received:', e.data);
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data)) {
          setResults(prev => {
            const existing = new Set(prev.map(b => b.bookUrl));
            return [...prev, ...data.filter((b: Book) => !existing.has(b.bookUrl))];
          });
        }
      } catch (err) {
        console.error('[Search] Parse error:', err);
      }
    };

    ws.onerror = (err) => { 
      console.error('[Search] WebSocket error:', err);
      setSearching(false); 
      toast.error('Lỗi kết nối'); 
    };
    
    ws.onclose = (e) => {
      console.log('[Search] WebSocket closed:', e.code, e.reason);
      setSearching(false);
    };
  };

  const handleAddBook = async (book: Book) => {
    setSaving(book.bookUrl);
    try {
      await saveBook(book);
      setSaved(prev => new Set(prev).add(book.bookUrl));
      toast.success(`Đã thêm "${book.name}"`);
    } catch {
      toast.error('Không thể thêm sách');
    }
    setSaving(null);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground text-center mb-4 text-sm">Cần kết nối Legado để tìm kiếm.</p>
        <button onClick={() => navigate('/settings')} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
          Cài đặt kết nối
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kệ sách</span>
        </button>

        <h1 className="text-2xl font-bold font-serif mb-5 text-foreground">Tìm kiếm sách</h1>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Nhập tên sách hoặc tác giả..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm border border-transparent focus:border-primary/30 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tìm'}
          </button>
        </div>

        {searching && results.length === 0 && (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Đang tìm kiếm...</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2.5">
            {searching && <p className="text-[11px] text-muted-foreground mb-2">Đang tìm thêm...</p>}
            {results.map((book) => (
              <div key={book.bookUrl} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:bg-accent/30 transition-colors">
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  <img
                    src={book.coverUrl || defaultCover}
                    alt={book.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = defaultCover; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold font-serif text-sm text-card-foreground line-clamp-1">{book.name}</h3>
                  <p className="text-xs text-muted-foreground">{book.author}</p>
                  {book.kind && <p className="text-[11px] text-primary/70 mt-0.5">{book.kind}</p>}
                  {book.originName && <p className="text-[10px] text-muted-foreground mt-0.5">{book.originName}</p>}
                </div>
                <button
                  onClick={() => handleAddBook(book)}
                  disabled={saving === book.bookUrl || saved.has(book.bookUrl)}
                  className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                    saved.has(book.bookUrl) 
                      ? 'bg-green-500/10 text-green-600' 
                      : 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50'
                  }`}
                >
                  {saving === book.bookUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : saved.has(book.bookUrl) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {!searching && results.length === 0 && query && (
          <p className="text-center text-muted-foreground text-sm py-16">Không tìm thấy kết quả.</p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
