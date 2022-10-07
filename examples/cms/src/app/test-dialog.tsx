import {
  CancelationError,
  ModalDialog,
  PendingButton,
} from '@caliobase/caliobase-ui';
import { create } from 'react-modal-promise';

export function TestDialog() {
  return (
    <div>
      <PendingButton
        className="rounded bg-indigo-700 p-3 font-bold text-white"
        onClick={async () => await openDialog()}
      >
        Open Dialog
      </PendingButton>
    </div>
  );
}

const openDialog = create(({ isOpen, onReject, onResolve }) => {
  return (
    <ModalDialog
      open={isOpen}
      setOpen={(open) => !open && onReject(new CancelationError())}
    >
      <div className="grid gap-2">
        <PendingButton
          className="rounded bg-indigo-700 p-3 font-bold text-white"
          onClick={async () => await openDialog()}
        >
          Open New Dialog
        </PendingButton>
        <PendingButton
          className="rounded bg-gray-700 p-3 font-bold text-white"
          onClick={async () => onResolve()}
        >
          Close Dialog
        </PendingButton>
      </div>
    </ModalDialog>
  );
});
