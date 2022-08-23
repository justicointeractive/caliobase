import { faTrash, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  DragEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useUploadImage } from '../hooks/useUploadImage';
import { useFormContext } from './data/FormContext';

export function ImageUpload(props: {
  image: unknown | null;
  onChange: (value: unknown | null) => void;
}) {
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  const { uploadImageFile, toUrl } = useUploadImage();

  const formContext = useFormContext();

  const handleFileSelected = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl });
  }, []);

  useEffect(() => {
    if (pendingFile) {
      const removeFormControl = formContext.addFormControl({
        onBeforeSave: async () => {
          const image = await uploadImageFile(pendingFile.file);
          props.onChange(image);
          setPendingFile(null);
        },
      });

      return () => {
        removeFormControl();
      };
    }
    return () => void 0;
  }, [formContext, pendingFile, props, uploadImageFile]);

  const handleChooseFile = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          handleFileSelected(file);
        }
      };
      input.click();
    },
    [handleFileSelected]
  );

  const handleClearFile = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      setPendingFile(null);
      props.onChange(null);
    },
    [props]
  );

  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = useCallback<DragEventHandler>(
    (e) => {
      e.preventDefault();

      const file = getFileFromDrop(e);
      if (file) {
        handleFileSelected(file);
      }

      setDragOver(false);
    },
    [handleFileSelected]
  );

  const handleDragOver = useCallback<DragEventHandler>((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragOut = useCallback<DragEventHandler>((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const hasFile = !!(pendingFile || props.image);

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDrop={handleFileDrop}
    >
      <div className="h-[220px] rounded bg-gray-300">
        {pendingFile?.previewUrl || props.image ? (
          <img
            className="absolute inset-0 h-full w-full object-contain object-center"
            src={pendingFile?.previewUrl || toUrl(props.image)}
            alt={'Preview'}
          />
        ) : (
          <button
            className="absolute inset-2 grid place-content-center place-items-center gap-3 text-gray-400"
            onClick={handleChooseFile}
          >
            <FontAwesomeIcon className="h-12 w-12" icon={faUpload} />
            <div>Drop an image here to upload or click to browse.</div>
          </button>
        )}
      </div>
      {hasFile && (
        <div className="absolute left-1 bottom-1 flex gap-1">
          <button
            className="flex rounded border border-gray-400 bg-gray-200 p-1 text-gray-700 disabled:opacity-60"
            onClick={handleChooseFile}
          >
            <FontAwesomeIcon className="h-3 w-3" icon={faUpload} />
          </button>
          <button
            className="flex rounded border border-gray-400 bg-gray-200 p-1 text-gray-700 disabled:opacity-60"
            onClick={handleClearFile}
          >
            <FontAwesomeIcon className="h-3 w-3" icon={faTrash} />
          </button>
        </div>
      )}
      {dragOver && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded bg-indigo-600/80 text-indigo-50"
          onDragLeave={handleDragOut}
        >
          Drop file here to upload
        </div>
      )}
    </div>
  );
}

function getFileFromDrop(e: React.DragEvent) {
  return [
    ...Array.from(e.dataTransfer.items).map((item) => item.getAsFile()),
    ...Array.from(e.dataTransfer.files),
  ][0];
}
