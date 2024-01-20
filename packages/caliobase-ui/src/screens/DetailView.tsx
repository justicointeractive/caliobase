import { faExternalLinkSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsyncEffectState } from 'use-async-effect-state';
import { ConfirmButton } from '../components/ConfirmButton';
import { PendingButton } from '../components/PendingButton';
import { FormContextProvider } from '../components/data/FormContext';
import { ItemView } from '../components/data/ItemView';
import { useContentType } from '../hooks/useContentType';
import { assert } from '../lib/assert';
import { FocusView } from '../patterns/FocusView';

export function DetailView() {
  const { contentType, itemId } = useParams();

  assert(contentType);

  const navigate = useNavigate();

  const {
    contentTypeApi,
    fields,
    createInstance,
    save,
    label: { plural },
    accessories,
    ...contentTypeDescription
  } = useContentType(contentType);

  const [item, setItem] = useAsyncEffectState(
    undefined,
    async (signal) => {
      if (itemId == null || itemId === 'create') {
        return createInstance();
      }

      const response = await contentTypeApi?.findOne(itemId, {
        signal,
      });

      return response?.data.item ?? null;
    },
    [itemId, contentTypeApi]
  );

  const navigateToList = useCallback(() => {
    navigate('./..');
  }, [navigate]);

  const onSave = useCallback(
    async (item: Parameters<typeof save>[0]) => {
      const result = await save(item);
      navigate(`./../${result.id}`);
    },
    [navigate, save]
  );

  const onConfirmedDelete = useCallback(
    async (item: Parameters<typeof save>[0]) => {
      await contentTypeApi?.remove(item.id!);
      navigateToList();
    },
    [contentTypeApi, navigateToList]
  );

  return (
    <FormContextProvider>
      {(formContext) => (
        <FocusView
          onGoBack={navigateToList}
          preTitle="Content Management"
          title={plural}
          accessories={accessories?.({
            item,
          })}
          buttons={[
            item?.id ? (
              <ConfirmButton
                className="border-red-700 bg-transparent text-red-700"
                onConfirmedClick={() => item && onConfirmedDelete(item)}
              >
                Delete
              </ConfirmButton>
            ) : null,
            <PendingButton
              onClick={async () => {
                if (item) {
                  const savedItem = await formContext.onBeforeSave(item);
                  await onSave(savedItem);
                }
              }}
            >
              Save
            </PendingButton>,

            contentTypeDescription.frontEndUrl?.item && item ? (
              <a
                className={clsx(item.id ? '' : 'opacity-25')}
                href={item.id && contentTypeDescription.frontEndUrl.item(item)}
                target="_blank"
                rel="noopener"
              >
                <FontAwesomeIcon icon={faExternalLinkSquare} />
              </a>
            ) : null,
          ]}
        >
          {item && (
            <ItemView
              key={item.id}
              itemState={item}
              onItemChange={setItem}
              fields={fields}
            />
          )}
        </FocusView>
      )}
    </FormContextProvider>
  );
}
