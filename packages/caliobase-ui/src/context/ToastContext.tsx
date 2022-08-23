import { Transition } from '@headlessui/react';
import clsx from 'clsx';
import { without } from 'lodash';
import {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useLatestValueRef } from 'use-async-effect-state';

let toastUid = 0;

export type ToastLevel = 'error' | 'warning' | 'info';

export type ToastContent = {
  title: string;
  message: string;
  level: ToastLevel;
};

export type ToastInstance = {
  readonly id: number;
  content: ToastContent;
  hide: (hide?: boolean) => void;
  render: (props: { offsetTop: number }) => ReactNode;
  height: number | null;
  show: boolean;
};

const ToastContext = createContext<{
  show: (content: ToastContent) => ToastInstance;
}>(null!);

export function ToastContextProvider({
  render,
  children,
  className,
}: {
  render: (opts: ToastInstance) => ReactElement;
  children: ReactNode;
  className?: string;
}) {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);

  const renderRef = useLatestValueRef(render);

  const providerValue = useMemo(
    () => ({
      show: (content: ToastContent) => {
        const toastInstance: ToastInstance = {
          id: toastUid++,
          show: true,
          height: null,
          content,
          hide: (hide = true) => {
            toastInstance.show = !hide;
            setToasts((t) => [...t]);
          },
          render: ({ offsetTop }: { offsetTop: number }) => {
            const rendered = renderRef.current(toastInstance);
            return (
              <Transition
                ref={(el: HTMLElement | null) => {
                  toastInstance.height = el?.clientHeight ?? null;
                  toastInstance.hide(false);
                }}
                appear
                key={toastInstance.id}
                show={toastInstance.show}
                enter={'transition duration-75'}
                enterFrom={'opacity-0 translate-x-1'}
                enterTo={'opacity-100 translate-x-0'}
                leave={'transition duration-125'}
                leaveFrom={'opacity-100 translate-x-0'}
                leaveTo={'opacity-0 translate-x-1'}
                className="absolute inset-x-0 top-0 transition-all"
                afterLeave={() => setToasts((t) => without(t, toastInstance))}
                style={{
                  top: `${offsetTop}px`,
                }}
              >
                {rendered}
              </Transition>
            );
          },
        };

        setToasts((t) => [...t, toastInstance]);

        return toastInstance;
      },
    }),
    [renderRef]
  );

  const renderedToasts = toasts.reduce(
    (toasts, toast) => {
      return {
        offsetTop: toasts.offsetTop + (toast.height ?? 0),
        rendered: [...toasts.rendered, toast.render(toasts)],
      };
    },
    { offsetTop: 0, rendered: [] as ReactNode[] }
  );

  return (
    <ToastContext.Provider value={providerValue}>
      {children}
      <Transition
        show={toasts.length > 0}
        unmount
        className={clsx(className ?? 'fixed top-0 right-0 grid w-[320px] p-2')}
      >
        <div className="relative" style={{ height: renderedToasts.offsetTop }}>
          <div
            className="absolute inset-x-0 grid place-content-center transition-all"
            style={{ top: renderedToasts.offsetTop }}
          >
            <button
              className="rounded-full bg-gray-800/75 px-4 py-1 text-sm text-white hover:bg-gray-600/75"
              onClick={() => toasts.forEach((toast) => toast.hide())}
            >
              Clear All
            </button>
          </div>
          {renderedToasts.rendered}
        </div>
      </Transition>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  return useContext(ToastContext);
}
