import Attaches from '@editorjs/attaches';
import EditorJS, { type EditorConfig, type OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Image from '@editorjs/image';
import List from '@editorjs/list';
import { useEffect, useRef, useState } from 'react';
import { useLatestValueRef } from 'use-async-effect-state';
import { useApiContext, useUserContext } from '../../context';
import { ContentField } from '../../lib';
import { assert } from '../../lib/assert';
import { LabeledInput } from '../LabeledInput';
import { useFormContext } from './FormContext';

export type EditorJsTools = NonNullable<EditorConfig['tools']>;

type UploadedImage = {
  objectStorageObject: { cdnUrl: string };
  width: number;
  height: number;
};

type UploadedFile = {
  cdnUrl: string;
  contentLength: number;
  contentType: string;
};

export function createEditorJsTools({
  tools,
  uploadImageFile,
  uploadFile,
}: {
  tools?: EditorJsTools;
  uploadImageFile: (file: File) => Promise<UploadedImage>;
  uploadFile: (file: File) => Promise<UploadedFile>;
}): EditorJsTools {
  return {
    header: Header,
    list: List,
    image: {
      class: Image,
      config: {
        uploader: {
          async uploadByFile(file: File): Promise<{
            success: true;
            file: { url: string; width: number; height: number };
          }> {
            const image = await uploadImageFile(file);
            return {
              success: true,
              file: {
                url: image.objectStorageObject.cdnUrl,
                width: image.width,
                height: image.height,
              },
            };
          },
          async uploadByUrl() {
            throw new Error('not implemented');
          },
        },
      },
    },
    attaches: {
      class: Attaches,
      config: {
        uploader: {
          async uploadByFile(file: File): Promise<{
            success: boolean;
            file: {
              url: string;
              name: string;
              size: number;
              contentType: string;
            };
          }> {
            const object = await uploadFile(file);
            return {
              success: true,
              file: {
                url: object.cdnUrl,
                size: object.contentLength,
                name: file.name,
                contentType: object.contentType,
              },
            };
          },
        },
      },
    },
    ...tools,
  };
}

function EditorJs({
  defaultValue,
  field,
  tools,
  defaultBlock,
  inlineToolbar,
  tunes,
  i18n,
  ...props
}: {
  field: ContentField;
  label: string;
  placeholder?: string;
  defaultValue?: OutputData | null;
  tools?: EditorJsTools;
  defaultBlock?: EditorConfig['defaultBlock'];
  inlineToolbar?: EditorConfig['inlineToolbar'];
  tunes?: EditorConfig['tunes'];
  i18n?: EditorConfig['i18n'];
}) {
  defaultValue ??= { blocks: [] };

  const { caliobaseUiConfiguration } = useApiContext();
  const { userOrgApi } = useUserContext();
  const [holder, setHolder] = useState<HTMLElement | null>(null);

  const initialValueRef = useRef(defaultValue);

  const caliobaseUiConfigurationRef = useLatestValueRef(
    caliobaseUiConfiguration
  );
  const userOrgApiRef = useLatestValueRef(userOrgApi);
  const formContext = useFormContext();

  const [hasBlocks, setHasBlocks] = useState(defaultValue.blocks.length > 0);

  useEffect(() => {
    if (holder) {
      const el = document.createElement('div');
      holder.appendChild(el);
      const editor = new EditorJS({
        data: initialValueRef.current,
        defaultBlock,
        holder: el,
        i18n,
        inlineToolbar,
        tools: createEditorJsTools({
          tools,
          uploadImageFile: async (file) => {
            const { uploadImageFile } =
              caliobaseUiConfigurationRef.current.createImageHandler(
                userOrgApiRef.current
              );
            return uploadImageFile(file);
          },
          uploadFile: async (file) => {
            const userOrgApi = userOrgApiRef.current;
            assert(userOrgApi);
            return caliobaseUiConfigurationRef.current.uploadFile(
              userOrgApi,
              file
            );
          },
        }),
        tunes,
        onChange: () => {
          setHasBlocks(editor.blocks.getBlocksCount() > 0);
        },
      });

      const removeFormControl = formContext.addFormControl({
        field,
        onBeforeSave: async (item, f) => {
          const savedValue = await editor.saver.save();
          return { ...item, [f.property]: savedValue };
        },
      });

      return () => {
        removeFormControl();
        editor.isReady
          .then(() => {
            editor.destroy();
            el.remove();
          })
          .catch((err) => console.error(err));
      };
    }
    return;
  }, [
    caliobaseUiConfigurationRef,
    defaultBlock,
    field,
    formContext,
    holder,
    i18n,
    inlineToolbar,
    tools,
    tunes,
    userOrgApiRef,
  ]);

  return (
    <LabeledInput
      value={hasBlocks}
      label={props.label}
      placeholder={props.placeholder}
    >
      {/* this wrapper div is not only to add padding but also to preserve the full-width-ness inside 
          the grid that we lose with the max-w-none that follows it */}
      <div className="pt-3">
        <div className="prose relative mx-auto max-w-none">
          <div ref={setHolder}></div>
        </div>
      </div>
    </LabeledInput>
  );
}

export default EditorJs;
