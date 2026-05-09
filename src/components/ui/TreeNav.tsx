import { useState } from 'react';

export interface TreeNavItem {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNavItem[];
}

interface TreeNavProps {
  items: TreeNavItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function TreeNav({ items, selectedId, onSelect, className = '' }: TreeNavProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderItem = (item: TreeNavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const isSelected = selectedId === item.id;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            }
            onSelect(item.id);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
            isSelected
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
              : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {hasChildren && (
            <span className="text-xs">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {item.icon && <span>{item.icon}</span>}
          <span className="flex-1">{item.label}</span>
        </button>
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={`overflow-y-auto ${className}`}>
      {items.map((item) => renderItem(item))}
    </nav>
  );
}
