import { useCallback, useEffect, useRef, useState } from 'react';
import { from, ObservableInput } from 'rxjs';
import { useLatestValueRef } from './useLatestValueRef';

export function useAsyncEffectState<TInit, TState>(
  initialState: TInit,
  derriveState: (abortSignal: AbortSignal) => ObservableInput<TState>,
  deps: unknown[],
  key?: unknown
) {
  const derriveStateRef = useLatestValueRef(derriveState);
  const [state, setState] = useState<TInit | TState>(initialState);

  const [reload, setReload] = useState(0);
  const incrementReload = useCallback(() => setReload((v) => v + 1), []);

  const keyRef = useRef(key);
  if (keyRef.current !== key) {
    setState(initialState);
    keyRef.current = key;
  }

  useEffect(() => {
    const controller = new AbortController();
    const subject = from(derriveStateRef.current(controller.signal));
    const subscription = subject.subscribe(setState);
    return () => {
      subscription.unsubscribe();
      controller.abort();
    };
  }, [...deps, reload, derriveStateRef]);

  return [state, setState, { reload: incrementReload }] as const;
}
