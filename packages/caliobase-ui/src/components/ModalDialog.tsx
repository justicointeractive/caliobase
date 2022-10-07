import {
  FloatingFocusManager,
  FloatingNode,
  FloatingOverlay,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingTree,
  useInteractions,
  useRole,
} from '@floating-ui/react-dom-interactions';
import { MutableRefObject, ReactNode } from 'react';

export function ModalDialog({
  open,
  setOpen,
  children,
  initialFocus,
}: {
  open: boolean;
  children: ReactNode;
  setOpen: (value: boolean) => void;
  initialFocus?: MutableRefObject<HTMLElement | null>;
}) {
  const tree = useFloatingTree();
  const nodeId = useFloatingNodeId();

  const node = tree?.nodesRef.current.find((node) => node.id === nodeId);
  const prevNode = tree?.nodesRef.current.find(
    (node, i, nodes) => nodes[i + 1]?.id === nodeId
  );

  if (node && prevNode) {
    node.parentId = prevNode.id;
  }

  const { floating, context } = useFloating({
    nodeId,
    open,
    onOpenChange: setOpen,
  });

  const { getFloatingProps } = useInteractions([
    useClick(context),
    useRole(context),
    useDismiss(context, { bubbles: false }),
  ]);

  return (
    <FloatingNode id={nodeId}>
      <FloatingPortal>
        {open && (
          <FloatingOverlay
            lockScroll
            className="z-20 grid place-items-center bg-gray-800/80"
          >
            <FloatingFocusManager context={context} initialFocus={initialFocus}>
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
    </FloatingNode>
  );
}
