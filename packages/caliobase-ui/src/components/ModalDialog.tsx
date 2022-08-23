import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react-dom-interactions';
import { ReactNode } from 'react';

export function ModalDialog({
  open,
  setOpen,
  children,
}: {
  open: boolean;
  children: ReactNode;
  setOpen: (value: boolean) => void;
}) {
  const { floating, context } = useFloating({
    open,
    onOpenChange: setOpen,
  });

  const { getFloatingProps } = useInteractions([
    useClick(context),
    useRole(context),
    useDismiss(context),
  ]);

  return (
    <FloatingPortal>
      {open && (
        <FloatingOverlay
          lockScroll
          className="z-20 grid place-items-center bg-gray-800/80"
        >
          <FloatingFocusManager context={context}>
            <div
              className="grid gap-3 rounded bg-white p-3 text-gray-800 shadow-2xl"
              {...getFloatingProps({ ref: floating })}
            >
              {children}
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      )}
    </FloatingPortal>
  );
}
