
import { useEffect, useRef } from 'react';

export const useModalBackHandler = (isOpen: boolean, onClose: () => void) => {
  const onCloseRef = useRef(onClose);
  const poppedRef = useRef(false);

  // Update ref when onClose changes to avoid re-triggering the effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Push a new entry to the history stack
      window.history.pushState({ modalOpen: true }, '');
      poppedRef.current = false;

      const handlePopState = (e: PopStateEvent) => {
        // The back button/gesture was triggered
        poppedRef.current = true;
        // Call the close callback
        if (onCloseRef.current) {
            onCloseRef.current();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        // If cleanup is running and it wasn't due to popstate (i.e., closed via UI button),
        // we need to manually go back to remove the history entry we pushed.
        if (!poppedRef.current) {
          window.history.back();
        }
      };
    }
  }, [isOpen]);
};
