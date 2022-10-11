import { useCallback, useState } from 'react';
import { useLatestValueRef } from './useLatestValueRef';

export function useSetState<T, TExtraArgs extends any[]>(
  initialState: T | (() => T),
  beforeSetState: (newValue: T, oldValue: T, ...args: TExtraArgs) => T
) {
  const [state, _setState] = useState(initialState);
  const beforeSetStateRef = useLatestValueRef(beforeSetState);
  const setState = useCallback(
    function setState(newValue: T, ...args: TExtraArgs) {
      _setState((oldValue) => {
        return beforeSetStateRef.current(newValue, oldValue, ...args);
      });
    },
    [beforeSetStateRef]
  );
  return [state, setState] as const;
}
