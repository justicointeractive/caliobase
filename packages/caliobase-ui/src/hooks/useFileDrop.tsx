import React, {
  DragEventHandler,
  MouseEventHandler,
  useCallback,
  useState,
} from 'react';

export function useFileDrop({
  acceptTypes,
  onChange,
}: {
  acceptTypes: string;
  onChange: (value: File | null) => void;
}) {
  const handleChooseFile = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = acceptTypes;
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          onChange(file);
        }
      };
      input.click();
    },
    [acceptTypes, onChange]
  );

  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = useCallback<DragEventHandler>(
    (e) => {
      e.preventDefault();

      const file = getFileFromDrop(e);
      if (file) {
        onChange(file);
      }

      setDragOver(false);
    },
    [onChange]
  );

  const handleDragOver = useCallback<DragEventHandler>((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragOut = useCallback<DragEventHandler>((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return {
    handleChooseFile,
    handleDragOut,
    handleDragOver,
    handleFileDrop,
    dragOver,
  };
}
function getFileFromDrop(e: React.DragEvent) {
  return [
    ...Array.from(e.dataTransfer.items).map((item) => item.getAsFile()),
    ...Array.from(e.dataTransfer.files),
  ][0];
}
