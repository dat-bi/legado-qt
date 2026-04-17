import { ArrowLeft, List, Settings, Languages } from 'lucide-react';
import { Minus, Plus } from 'lucide-react';
import { readerThemes } from '@/pages/Reader';
import type { Book, BookChapter } from '@/data/bookTypes';
import { useEffect, useRef } from 'react';

const READER_FONTS = [
  { label: 'Lora', value: 'Lora' },
  { label: 'Noto Serif', value: 'Noto Serif' },
  { label: 'Merriweather', value: 'Merriweather' },
  { label: 'PT Serif', value: 'PT Serif' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Nunito', value: 'Nunito' },
  { label: 'Hệ thống', value: 'system-ui' },
];

interface ReaderToolbarProps {
  show: boolean;
  showCatalog: boolean;
  showSettings: boolean;
  setShowCatalog: (v: boolean) => void;
  setShowSettings: (v: boolean) => void;
  currentTheme: typeof readerThemes[0];
  chapter?: BookChapter;
  chapters: BookChapter[];
  chapterIndex: number;
  book: Book;
  fontSize: number;
  setFontSize: (s: number) => void;
  theme: number;
  setTheme: (t: number) => void;
  goChapter: (i: number) => void;
  onBack: () => void;
  translate: boolean;
  onToggleTranslate: () => void;
  hideTranslate?: boolean;
  wordSpacing: number;
  setWordSpacing: (s: number) => void;
  paragraphSpacing: number;
  setParagraphSpacing: (s: number) => void;
  fontFamily: string;
  setFontFamily: (f: string) => void;
}

const ReaderToolbar = ({
  show, showCatalog, showSettings, setShowCatalog, setShowSettings,
  currentTheme, chapter, chapters, chapterIndex, fontSize, setFontSize,
  theme, setTheme, goChapter, onBack, translate, onToggleTranslate, hideTranslate,
  wordSpacing, setWordSpacing, paragraphSpacing, setParagraphSpacing,
  fontFamily, setFontFamily,
}: ReaderToolbarProps) => {
  const catalogRef = useRef<HTMLDivElement>(null);
  const activeChapterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showCatalog && activeChapterRef.current && catalogRef.current) {
      setTimeout(() => {
        activeChapterRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
    }
  }, [showCatalog]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5 backdrop-blur-xl border-b"
        style={{ background: `${currentTheme.popup}ee`, borderColor: `${currentTheme.text}08` }}
      >
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity" onClick={onBack}>
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <span className="text-sm font-medium opacity-70 truncate max-w-[180px] md:max-w-[300px]">
            {chapter?.title || ''}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {!hideTranslate && (
            <button
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                translate 
                  ? 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground' 
                  : 'bg-primary text-primary-foreground shadow-sm'
              }`}
              onClick={onToggleTranslate}
              title={translate ? 'Bấm để xem nguyên bản' : 'Bấm để xem bản dịch'}
            >
              <Languages className="w-[18px] h-[18px]" />
            </button>
          )}
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
            onClick={() => { setShowCatalog(!showCatalog); setShowSettings(false); }}>
            <List className="w-[18px] h-[18px]" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
            onClick={() => { setShowSettings(!showSettings); setShowCatalog(false); }}>
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {showCatalog && (
        <div ref={catalogRef} className="max-h-[60vh] overflow-y-auto custom-scrollbar border-b rounded-b-2xl"
          style={{ background: currentTheme.popup, borderColor: `${currentTheme.text}08` }}>
          <div className="p-3">
            <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider opacity-40">Mục lục</h3>
            {chapters.map((ch) => (
              <button
                key={ch.index}
                ref={ch.index === chapterIndex ? activeChapterRef : undefined}
                onClick={() => goChapter(ch.index)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${ch.index === chapterIndex ? 'font-semibold opacity-100' : 'opacity-50 hover:opacity-80'}`}
                style={ch.index === chapterIndex ? { background: `${currentTheme.text}08` } : {}}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="border-b p-4 max-h-[70vh] overflow-y-auto custom-scrollbar rounded-b-2xl" style={{ background: currentTheme.popup, borderColor: `${currentTheme.text}08` }}>
          <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider opacity-40">Cài đặt đọc</h3>
          
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 mb-4 rounded-xl p-3" style={{ background: `${currentTheme.text}04`, border: `1px solid ${currentTheme.text}08` }}>
            <span className="text-sm opacity-60 self-center">Cỡ chữ</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ background: `${currentTheme.text}08` }}>
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm w-8 text-center font-mono font-medium opacity-70">{fontSize}</span>
              <button onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ background: `${currentTheme.text}08` }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-sm opacity-60 self-center">Giãn chữ</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setWordSpacing(Math.max(-2, wordSpacing - 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ background: `${currentTheme.text}08` }}>
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm w-8 text-center font-mono font-medium opacity-70">{wordSpacing}</span>
              <button onClick={() => setWordSpacing(Math.min(10, wordSpacing + 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ background: `${currentTheme.text}08` }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-sm opacity-60 self-center">Giãn đoạn</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setParagraphSpacing(Math.max(0, paragraphSpacing - 4))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ background: `${currentTheme.text}08` }}>
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm w-8 text-center font-mono font-medium opacity-70">{paragraphSpacing}</span>
              <button onClick={() => setParagraphSpacing(Math.min(48, paragraphSpacing + 4))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ background: `${currentTheme.text}08` }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Font family */}
          <div className="mb-4">
            <span className="text-sm opacity-60 block mb-2">Phông chữ</span>
            <div className="flex flex-wrap gap-2">
              {READER_FONTS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFontFamily(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${fontFamily === f.value ? 'font-semibold ring-2' : 'opacity-60 hover:opacity-90'}`}
                  style={{
                    fontFamily: f.value,
                    background: fontFamily === f.value ? `${currentTheme.text}10` : `${currentTheme.text}05`,
                    outline: fontFamily === f.value ? `2px solid hsl(var(--warm-gold))` : undefined,
                    outlineOffset: '1px',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <span className="text-sm opacity-60 block mb-2">Chủ đề</span>
            <div className="flex gap-2">
              {readerThemes.map((t, i) => (
                <button key={i} onClick={() => setTheme(i)}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${theme === i ? 'scale-110 ring-2 ring-offset-1' : 'hover:scale-105'}`}
                  style={{
                    background: t.bg,
                    borderColor: theme === i ? `hsl(var(--warm-gold))` : `${t.text}15`,
                  }}
                  title={t.name} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReaderToolbar;
