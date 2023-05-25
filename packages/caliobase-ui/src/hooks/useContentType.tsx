import { pick } from 'lodash';
import { useCallback } from 'react';
import { useApiContext, useUserContext } from '../context';
import { createInstanceFromFields } from '../lib';
import { ICaliobaseEntityApi } from '../lib/types';

export function useContentType(contentTypeName: string) {
  const { userOrgApi } = useUserContext();

  const contentTypeDescriptor =
    useApiContext().caliobaseUiConfiguration.getContentType(contentTypeName);

  if (!contentTypeDescriptor) {
    throw new Error(`unknown content type: ${contentTypeName}`);
  }

  const { fields, getApi } = contentTypeDescriptor;

  const contentTypeApi = getApi(userOrgApi) as ICaliobaseEntityApi<{
    id: string;
  }>;

  const createInstance = useCallback(() => {
    return createInstanceFromFields(fields);
  }, [fields]);

  const save = useCallback(
    async <T extends { id?: string }>({ id, ...item }: T) => {
      const itemFields = pick(
        item,
        fields.map((f) => f.property)
      );
      if (id != null) {
        return (await contentTypeApi?.update(id, itemFields))?.data.items?.[0];
      } else {
        return (await contentTypeApi?.create(itemFields))?.data.item;
      }
    },
    [contentTypeApi, fields]
  );

  return {
    contentTypeApi,
    ...contentTypeDescriptor,
    createInstance,
    save,
  };
}
