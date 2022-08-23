import { useRef } from 'react';

export function useLatestValueRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
