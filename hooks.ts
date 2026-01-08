
import { useEffect, useRef } from 'react';

export const useModalBackHandler = (isOpen: boolean, onClose: () => void) => {
  const onCloseRef = useRef(onClose);
  // Track if we have manually popped the state or if the system did it
  const isHistoryPushed = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // 当模态框打开时，推入一个新的历史状态
      // 这使得安卓物理返回键会 "后退" 到上一个状态（即关闭模态框），而不是退出应用
      window.history.pushState({ modalOpen: true }, '');
      isHistoryPushed.current = true;

      const handlePopState = (e: PopStateEvent) => {
        // 当用户点击物理返回键时，popstate 事件触发
        // 此时历史记录已经回退了，我们只需要更新 UI (关闭模态框)
        isHistoryPushed.current = false;
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        // 如果组件卸载（例如用户点击了页面上的关闭按钮），
        // 此时历史记录还在 "modalOpen" 状态，我们需要手动后退一次来清理它
        if (isHistoryPushed.current) {
          isHistoryPushed.current = false;
          window.history.back();
        }
      };
    }
  }, [isOpen]);
};
