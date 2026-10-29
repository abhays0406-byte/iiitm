import { useState, useRef, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualList<T>({ items, itemHeight, renderItem, className }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const viewHeight = 300;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewHeight) / itemHeight) + 1);
  const offset = startIndex * itemHeight;

  const visible = useMemo(
    () => items.slice(startIndex, endIndex).map((item, i) => ({ item, index: startIndex + i })),
    [items, startIndex, endIndex],
  );

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      className={className}
      style={{ position: 'relative', height: viewHeight, overflow: 'auto' }}
      onScroll={onScroll}
      ref={wrapperRef}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ height: offset }} />
        {visible.map(({ item, index }) => (
          <div key={index} style={{ position: 'absolute', top: index * itemHeight, height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
        <div style={{ height: totalHeight - offset - visible.length * itemHeight }} />
      </div>
    </div>
  );
}
