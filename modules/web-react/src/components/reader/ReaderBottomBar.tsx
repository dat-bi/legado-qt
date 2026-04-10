import { ChevronLeft, ChevronRight } from 'lucide-react';
import { readerThemes } from '@/pages/Reader';

interface ReaderBottomBarProps {
  show: boolean;
  currentTheme: typeof readerThemes[0];
  chapterIndex: number;
  totalChapters: number;
  goChapter: (i: number) => void;
}

const ReaderBottomBar = ({ show, currentTheme, chapterIndex, totalChapters, goChapter }: ReaderBottomBarProps) => (
  <div
    className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
    onClick={(e) => e.stopPropagation()}
  >
    <div
      className="flex items-center justify-between px-2 py-2 backdrop-blur-xl border-t shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      style={{ background: `${currentTheme.popup}ee`, borderColor: `${currentTheme.text}10` }}
    >
      <button
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-70 transition-opacity disabled:opacity-30"
        disabled={chapterIndex <= 0}
        onClick={() => goChapter(chapterIndex - 1)}
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Chương trước</span>
      </button>
      <div className="px-4 text-xs text-center opacity-60 min-w-[80px]">
        <div className="font-semibold">{chapterIndex + 1}/{totalChapters}</div>
      </div>
      <button
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-70 transition-opacity disabled:opacity-30"
        disabled={chapterIndex >= totalChapters - 1}
        onClick={() => goChapter(chapterIndex + 1)}
      >
        <span className="text-sm font-medium">Chương sau</span>
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  </div>
);

export default ReaderBottomBar;
