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
    async (e) => {
      e.preventDefault();

      const files = await getFilesFromDrop(e, mimeToRegex(acceptTypes));
      onChange(files);

      setDragOver(false);
    },
    [acceptTypes, onChange]
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

async function getFilesFromDrop(e: React.DragEvent, acceptType: RegExp) {
  const files: File[] = [];
  if ('items' in e.dataTransfer) {
    await addFilesRecursive(
      Array.from(e.dataTransfer.items, (item) =>
        item.webkitGetAsEntry()
      ).filter(nonNull),
      files
    );
  } else {
    files.push(...Array.from(e.dataTransfer.files));
  }
  return files.filter(nonNull).filter((file) => acceptType.test(file.type));
}

function mimeToRegex(type: string) {
  return new RegExp(
    `^${type.split('/').join('\\/').split('*').join('.*')}$`,
    'i'
  );
}

async function addFilesRecursive(items: FileSystemEntry[], files: File[]) {
  for (const entry of items) {
    if (isFile(entry)) {
      files.push(await getFile(entry));
    }

    if (isDir(entry)) {
      await addFilesRecursive(await readEntries(entry), files);
    }
  }
}

function getFile(entry: FileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

function readEntries(dir: FileSystemDirectoryEntry) {
  const reader = dir.createReader();
  return new Promise<FileSystemEntry[]>((resolve, reject) =>
    reader.readEntries(resolve, reject)
  );
}

function isFile(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile;
}

function isDir(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}
