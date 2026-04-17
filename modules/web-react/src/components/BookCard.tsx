import { type Book, getBookTypeInfo } from '@/data/bookTypes';
import { defaultCover } from '@/assets/default-cover';
import { useAppStore } from '@/store/appStore';

interface BookCardProps {
  book: Book;
  isGridView: boolean;
  onClick: (book: Book) => void;
  index: number;
}

const BookCard = ({ book, isGridView, onClick, index }: BookCardProps) => {
  const translate = useAppStore(s => s.translate);
  const unknownAuthor = translate ? 'Không rõ' : '不详';
  const progress = book.totalChapterNum > 0
    ? Math.round((book.durChapterIndex / book.totalChapterNum) * 100)
    : 0;

  const typeInfo = getBookTypeInfo(book.type);

  const timeAgo = (ms: number) => {
    if (!ms) return '';
    const diff = Date.now() - ms;
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}p`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)}d`;
    return `${Math.floor(diff / 2592000000)}th`;
  };

  if (isGridView) {
    return (
      <div
        onClick={() => onClick(book)}
        className="group relative bg-card rounded-lg sm:rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in"
        style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'backwards' }}
      >
        {/* Cover */}
        <div className="relative overflow-hidden bg-muted aspect-[3/4.2]">
          <img
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={book.coverUrl || defaultCover}
            alt={book.name}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = defaultCover; }}
          />
          
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Top badges */}
          <div className="absolute top-1 left-1 right-1 sm:top-1.5 sm:left-1.5 sm:right-1.5 flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
              {book.type != null && (
                <span className={`px-1 py-0.5 rounded text-[9px] sm:text-[9px] font-semibold shadow-sm backdrop-blur-sm leading-tight ${typeInfo.color}`}>
                  {typeInfo.icon}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 items-end">
              {book.lastCheckCount > 0 && (
                <span className="px-1 py-0.5 rounded bg-destructive text-destructive-foreground text-[9px] sm:text-[9px] font-bold shadow-sm leading-tight">
                  +{book.lastCheckCount}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar overlay */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground/10">
              <div className="h-full bg-warm-gold transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
          )}
        </div>

        {/* Info - fixed height sections for alignment */}
        <div className="p-2 pb-2.5 sm:p-2.5 sm:pb-3 flex flex-col">
          <h3 className="font-semibold text-card-foreground leading-snug text-xs sm:text-[13px] line-clamp-2 font-serif group-hover:text-primary transition-colors h-[32px] sm:h-[36px]">
            {book.name}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1 mt-auto min-h-[15px] sm:min-h-[17px]">
            {book.author || unknownAuthor}
          </p>
          
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground mt-1">
            <span>{book.totalChapterNum}ch</span>
            {progress > 0 ? (
              <span className="font-medium text-primary/80">{progress}%</span>
            ) : <span />}
            <span>{timeAgo(book.durChapterTime || book.lastCheckTime)}</span>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      onClick={() => onClick(book)}
      className="group flex items-center gap-2.5 sm:gap-3 bg-card rounded-lg sm:rounded-xl overflow-hidden cursor-pointer hover:bg-accent/30 transition-all duration-200 p-2 sm:p-2.5 animate-fade-in border border-transparent hover:border-border"
      style={{ animationDelay: `${Math.min(index * 25, 300)}ms`, animationFillMode: 'backwards' }}
    >
      <div className="relative overflow-hidden bg-muted flex-shrink-0 w-11 h-[58px] sm:w-14 sm:h-[74px] rounded-md sm:rounded-lg">
        <img
          className="w-full h-full object-cover"
          src={book.coverUrl || defaultCover}
          alt={book.name}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = defaultCover; }}
        />
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground/10">
            <div className="h-full bg-warm-gold" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-start gap-1.5">
          <h3 className="font-semibold text-card-foreground text-[13px] sm:text-sm line-clamp-1 font-serif flex-1 group-hover:text-primary transition-colors">
            {book.name}
          </h3>
          {book.lastCheckCount > 0 && (
            <span className="text-[10px] sm:text-[10px] text-destructive font-bold flex-shrink-0">+{book.lastCheckCount}</span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 min-h-[16px] sm:min-h-[18px]">{book.author || unknownAuthor}</p>
        {book.durChapterTitle && (
          <p className="text-[10px] sm:text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">📖 {book.durChapterTitle}</p>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
          {book.type != null && (
            <span className={`text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded ${typeInfo.color}`}>
              {typeInfo.icon} {typeInfo.label}
            </span>
          )}
          <span className="text-[10px] sm:text-[10px] text-muted-foreground">{book.totalChapterNum}ch</span>
          {progress > 0 && <span className="text-[10px] sm:text-[10px] font-medium text-primary/80">{progress}%</span>}
          <span className="text-[10px] sm:text-[10px] text-muted-foreground ml-auto">{timeAgo(book.durChapterTime || book.lastCheckTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default BookCard;