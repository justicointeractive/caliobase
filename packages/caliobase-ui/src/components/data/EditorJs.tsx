import Attaches from '@editorjs/attaches';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Image from '@editorjs/image';
import List from '@editorjs/list';
import { useEffect, useRef, useState } from 'react';
import { useLatestValueRef } from 'use-async-effect-state';
import { useApiContext, useUserContext } from '../../context';
import { assert } from '../../lib/assert';
import { LabeledInput } from '../LabeledInput';
import { useFormContext } from './FormContext';

function EditorJs(props: {
  label: string;
  placeholder?: string;
  defaultValue?: OutputData;
  onChange: (data: OutputData) => void;
}) {
  props.defaultValue ??= { blocks: [] };

  const { caliobaseUiConfiguration } = useApiContext();
  const { userOrgApi } = useUserContext();
  const [holder, setHolder] = useState<HTMLElement | null>(null);

  const initialValueRef = useRef(props.defaultValue);

  const onChangeRef = useLatestValueRef(props.onChange);
  const caliobaseUiConfigurationRef = useLatestValueRef(
    caliobaseUiConfiguration
  );
  const userOrgApiRef = useLatestValueRef(userOrgApi);
  const formContext = useFormContext();

  const [hasBlocks, setHasBlocks] = useState(
    props.defaultValue.blocks.length > 0
  );

  useEffect(() => {
    if (holder) {
      const el = document.createElement('div');
      holder.appendChild(el);
      const editor = new EditorJS({
        data: initialValueRef.current,
        holder: el,
        tools: {
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
                  const { uploadImageFile } =
                    caliobaseUiConfigurationRef.current.createImageHandler(
                      userOrgApiRef.current
                    );
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
                  const userOrgApi = userOrgApiRef.current;
                  assert(userOrgApi);
                  const object =
                    await caliobaseUiConfigurationRef.current.uploadFile(
                      userOrgApi,
                      file
                    );
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
        },
        onChange: () => {
          setHasBlocks(editor.blocks.getBlocksCount() > 0);
        },
      });

      const removeFormControl = formContext.addFormControl({
        onBeforeSave: async () => {
          const savedValue = await editor.saver.save();
          onChangeRef.current(savedValue);
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
    formContext,
    holder,
    onChangeRef,
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
