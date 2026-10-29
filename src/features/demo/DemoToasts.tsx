import { useEffect } from 'react';
import { useDemoToastStore, setToast } from '@/features/demo/useDemoToast';
import { Toast } from '@/ui/Toast';

export function DemoToasts() {
  const toasts = useDemoToastStore((s) => s.toasts);
  const dismiss = useDemoToastStore((s) => s.dismiss);

  useEffect(() => {
    setToast((message, ms = 3000) => {
      const { show } = useDemoToastStore.getState();
      show(message, ms);
    });
  }, []);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto', width: 340 }}>
          <Toast open message={t.message} onClose={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
