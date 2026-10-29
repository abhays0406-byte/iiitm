import { useState, useRef, useMemo, useLayoutEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/** Fills its parent's height and renders only the rows in view. */
export function VirtualList<T>({ items, itemHeight, renderItem, className }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(600);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => { if (el.clientHeight > 0) setViewHeight(el.clientHeight); };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewHeight) / itemHeight) + 1);

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
      style={{ position: 'relative', height: '100%', overflow: 'auto' }}
      onScroll={onScroll}
      ref={wrapperRef}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visible.map(({ item, index }) => (
          <div key={index} style={{ position: 'absolute', top: index * itemHeight, left: 0, right: 0, height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
