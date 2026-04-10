import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface DarkModeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

const DarkModeToggle = ({ className = '', size = 'md' }: DarkModeToggleProps) => {
  const { darkMode, setDarkMode } = useAppStore();

  const sizeClasses = size === 'sm' 
    ? 'w-7 h-7 sm:w-8 sm:h-8' 
    : 'w-10 h-10';

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4';

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`${sizeClasses} rounded-full flex items-center justify-center transition-all duration-200 bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent ${className}`}
      title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
    >
      {darkMode ? <Sun className={iconSize} /> : <Moon className={iconSize} />}
    </button>
  );
};

export default DarkModeToggle;
