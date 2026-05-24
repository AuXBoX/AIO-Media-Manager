import { useState, useMemo } from 'react';

interface AlphabetJumpListProps {
  items: Array<{ title: string; ratingKey: string }>;
  onJumpToLetter: (letter: string) => void;
  isLoading?: boolean;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

/**
 * AlphabetJumpList Component
 * Displays an alphabet sidebar for quick navigation like Plex
 */
export function AlphabetJumpList({ items, onJumpToLetter, isLoading = false }: AlphabetJumpListProps) {
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Memoize available letters calculation to prevent infinite loop
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    items.forEach((item) => {
      if (!item?.title) return;
      const firstChar = item.title.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) {
        letters.add(firstChar);
      } else if (/[0-9]/.test(firstChar)) {
        letters.add('#');
      }
    });
    return letters;
  }, [items]);

  const handleLetterClick = (letter: string) => {
    setActiveLetter(letter);
    onJumpToLetter(letter);
    
    // Clear active state after a short delay
    setTimeout(() => setActiveLetter(null), 1000);
  };

  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-[2px] bg-black/60 dark:bg-white/15 backdrop-blur-md rounded-lg p-1.5 shadow-xl max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500">
      {isLoading && (
        <div className="w-5 h-5 flex items-center justify-center mb-1">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {ALPHABET.map((letter) => {
        const isAvailable = availableLetters.has(letter);
        const isActive = activeLetter === letter;
        
        return (
          <button
            key={letter}
            onClick={() => handleLetterClick(letter)}
            className={`
              w-5 h-5 flex items-center justify-center text-[9px] font-bold rounded transition-all flex-shrink-0
              ${isActive 
                ? 'bg-primary-500 text-white scale-125 shadow-lg' 
                : isAvailable
                  ? 'text-white dark:text-gray-100 hover:bg-white/25 dark:hover:bg-white/25 hover:scale-110 cursor-pointer font-semibold'
                  : 'text-gray-300 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/10 cursor-pointer'
              }
            `}
            title={isAvailable ? `Jump to ${letter}` : `Jump to ${letter} (may need to load more items)`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
