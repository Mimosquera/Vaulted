import { useEffect } from 'react';

export function useModalScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;

    // iOS Safari ignores `overflow: hidden` on body for background scroll prevention,
    // and it also breaks overflow-y: auto inside fixed-position modals (content can't scroll).
    // The fix is to position the body as fixed at the current scroll offset,
    // then restore scroll position on unmount.
    const scrollY = window.scrollY;
    const body = document.body;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevLeft = body.style.left;
    const prevRight = body.style.right;
    const prevOverflow = body.style.overflow;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.left = prevLeft;
      body.style.right = prevRight;
      body.style.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
}
