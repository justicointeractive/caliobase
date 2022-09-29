import { nonNull } from 'circumspect';
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
  onChange: (value: File[] | null) => void;
}) {
  const handleChooseFile = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = acceptTypes;
      input.onchange = () => {
        onChange(input.files ? Array.from(input.files) : null);
      };
      input.click();
    },
    [acceptTypes, onChange]
  );

  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = useCallback<DragEventHandler>(
    (e) => {
      e.preventDefault();

      const files = getFilesFromDrop(e);
      onChange(files);

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

function getFilesFromDrop(e: React.DragEvent) {
  const files: File[] = [];
  if ('items' in e.dataTransfer) {
    addFilesRecursive(Array.from(e.dataTransfer.items), files);
  } else {
    files.push(...Array.from(e.dataTransfer.files));
  }
  return files.filter(nonNull);
}

function addFilesRecursive(
  items: (DataTransferItem | FileSystemEntry)[],
  files: File[]
) {
  for (const item of items) {
    const entry = item instanceof FileSystemEntry || item.webkitGetAsEntry();

    if (entry instanceof FileSystemFileEntry) {
      entry.file((file) => files.push(file));
    }

    if (entry instanceof FileSystemDirectoryEntry) {
      const dirReader = entry.createReader();
      dirReader.readEntries((entries) => addFilesRecursive(entries, files));
    }
  }
}
