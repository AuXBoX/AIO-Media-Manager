import { useState, useEffect } from 'react';

interface AlphabetJumpListProps {
  items: Array<{ title: string; ratingKey: string }>;
  onJumpToLetter: (letter: string) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

/**
 * AlphabetJumpList Component
 * Displays an alphabet sidebar for quick navigation like Plex
 */
export function AlphabetJumpList({ items, onJumpToLetter }: AlphabetJumpListProps) {
  const [availableLetters, setAvailableLetters] = useState<Set<string>>(new Set());
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Calculate which letters have items
  useEffect(() => {
    const letters = new Set<string>();
    items.forEach((item) => {
      const firstChar = item.title.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) {
        letters.add(firstChar);
      } else if (/[0-9]/.test(firstChar)) {
        letters.add('#');
      }
    });
    console.log('[AlphabetJumpList] Available letters:', Array.from(letters).sort().join(', '));
    console.log('[AlphabetJumpList] Sample titles:', items.slice(0, 10).map(i => i.title).join(', '));
    setAvailableLetters(letters);
  }, [items]);

  const handleLetterClick = (letter: string) => {
    setActiveLetter(letter);
    onJumpToLetter(letter);
    
    // Clear active state after a short delay
    setTimeout(() => setActiveLetter(null), 1000);
  };

  return (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5 bg-black/60 dark:bg-white/15 backdrop-blur-md rounded-lg p-2 shadow-xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 hover:scrollbar-thumb-gray-400">
      {ALPHABET.map((letter) => {
        const isAvailable = availableLetters.has(letter);
        const isActive = activeLetter === letter;
        
        return (
          <button
            key={letter}
            onClick={() => isAvailable && handleLetterClick(letter)}
            disabled={!isAvailable}
            className={`
              w-7 h-7 flex items-center justify-center text-xs font-bold rounded transition-all flex-shrink-0
              ${isActive 
                ? 'bg-primary-500 text-white scale-125 shadow-lg' 
                : isAvailable
                  ? 'text-white dark:text-gray-100 hover:bg-white/25 dark:hover:bg-white/25 hover:scale-110 cursor-pointer font-semibold'
                  : 'text-gray-600 dark:text-gray-700 cursor-not-allowed opacity-30'
              }
            `}
            title={isAvailable ? `Jump to ${letter}` : `No items starting with ${letter}`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
