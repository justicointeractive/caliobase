import { faTrash, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import { useFileDrop } from '../hooks/useFileDrop';
import { useUploadImage } from '../hooks/useUploadImage';
import { useFormContext } from './data/FormContext';

export function ImageUpload({
  image: existingFile,
  onChange,
}: {
  image: unknown | null;
  onChange: (value: unknown | null) => void;
}) {
  const { uploadImageFile, toUrl } = useUploadImage();

  const formContext = useFormContext();

  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  const {
    handleChooseFile,
    handleDragOut,
    handleDragOver,
    handleFileDrop,
    dragOver,
  } = useFileDrop({
    acceptTypes: 'image/*',
    onChange: useCallback((files) => {
      const file = files?.[0];
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        setPendingFile({ file, previewUrl });
      } else {
        setPendingFile(null);
      }
    }, []),
  });

  useEffect(() => {
    if (pendingFile) {
      const removeFormControl = formContext.addFormControl({
        onBeforeSave: async () => {
          const image = await uploadImageFile(pendingFile.file);
          onChange(image);
          setPendingFile(null);
        },
      });

      return () => {
        removeFormControl();
      };
    }
    return () => void 0;
  }, [formContext, onChange, pendingFile, setPendingFile, uploadImageFile]);

  const hasFile = !!(pendingFile || existingFile);

  const handleClearFile = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      setPendingFile(null);
      onChange(null);
    },
    [onChange]
  );

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDrop={handleFileDrop}
    >
      <div className="h-[220px] rounded bg-gray-300">
        {pendingFile?.previewUrl || existingFile ? (
          <img
            className="absolute inset-0 h-full w-full object-contain object-center"
            src={pendingFile?.previewUrl || toUrl(existingFile)}
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
