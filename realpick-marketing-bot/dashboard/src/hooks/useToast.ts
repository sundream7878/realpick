import { useState } from 'react';

export interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (props: Toast) => {
    // 간단한 alert로 대체 (나중에 toast 컴포넌트 추가)
    const message = props.description 
      ? `${props.title}\n${props.description}` 
      : props.title;
    
    if (props.variant === 'destructive') {
      alert(`❌ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }
  };

  return { toast, toasts };
}
