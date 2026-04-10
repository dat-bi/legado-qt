import { Languages } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface TranslateToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

const TranslateToggle = ({ className = '', size = 'md' }: TranslateToggleProps) => {
  const { translate, setTranslate } = useAppStore();

  const sizeClasses = size === 'sm' 
    ? 'w-7 h-7 sm:w-8 sm:h-8' 
    : 'w-10 h-10';

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4';

  // translate=true means showing Vietnamese (translated) — this is the default
  // translate=false means showing original language
  return (
    <button
      onClick={() => setTranslate(!translate)}
      className={`${sizeClasses} rounded-full flex items-center justify-center transition-all duration-200 ${
        translate 
          ? 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent' 
          : 'bg-primary text-primary-foreground shadow-md'
      } ${className}`}
      title={translate ? 'Bấm để xem nguyên bản' : 'Bấm để xem bản dịch'}
    >
      <Languages className={iconSize} />
    </button>
  );
};

export default TranslateToggle;