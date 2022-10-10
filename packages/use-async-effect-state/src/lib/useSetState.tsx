import { useCallback, useState } from 'react';
import { useLatestValueRef } from './useLatestValueRef';

export function useSetState<T>(
  initialState: T | (() => T),
  beforeSetState: (newValue: T, oldValue: T) => T
) {
  const [state, _setState] = useState(initialState);
  const beforeSetStateRef = useLatestValueRef(beforeSetState);
  const setState = useCallback(
    function setState(newValue: T) {
      _setState((oldValue) => {
        return beforeSetStateRef.current(newValue, oldValue);
      });
    },
    [beforeSetStateRef]
  );
  return [state, setState] as const;
}
