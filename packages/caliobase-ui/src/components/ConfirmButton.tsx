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
import { ComponentProps, useCallback, useState } from 'react';

export function ConfirmButton({
  onConfirmedClick,
  ...props
}: ComponentProps<'button'> & { onConfirmedClick: () => void }) {
  const [open, setOpen] = useState(false);
  const { reference, floating, context } = useFloating({
    open,
    onOpenChange: setOpen,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useRole(context),
    useDismiss(context),
  ]);

  const onCancel = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <button {...props} {...getReferenceProps({ ref: reference })}></button>
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
                <div className="grid">
                  <h4 className="text-lg font-bold">
                    Are you sure you want to do this?
                  </h4>
                  <p>You cannot undo this action</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    className="rounded bg-gray-600 px-4 py-2 text-sm font-bold text-white"
                    onClick={onCancel}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white"
                    onClick={onConfirmedClick}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        )}
      </FloatingPortal>
    </>
  );
}
