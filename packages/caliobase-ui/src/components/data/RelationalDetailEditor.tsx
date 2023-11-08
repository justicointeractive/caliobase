import { useCallback, useState } from 'react';
import { concat, defer, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { useAsyncEffectState } from 'use-async-effect-state';
import { useUserContext } from '../../context';
import { asserted } from '../../lib/assert';
import { ICaliobaseEntityApi } from '../../lib/types';
import { SelectInput } from '../SelectInput';
import { DetailEditorComponent } from './DetailEditorComponent';

export const RelationalDetailEditor: DetailEditorComponent<
  any,
  {
    limit?: number;
    relationship: string;
    titleField?: string;
    multiple?: boolean;
  }
> = ({ field, value, onChange, options }) => {
  type RelatedItem = { id: string; title: string };

  const titleField = options?.titleField ?? 'title';

  const { userOrgApi } = useUserContext();

  const [query, setQuery] = useState('');

  const relatedEntityApi = (userOrgApi as any)[
    asserted(options?.relationship)
  ] as ICaliobaseEntityApi<RelatedItem>;

  const [items, setItems] = useAsyncEffectState(
    null,
    (signal) => {
      return concat(
        of(null),
        of(null).pipe(delay(350)),
        defer(async () => {
          const response = await relatedEntityApi.findAll(
            {
              skip: 0,
              limit: options?.limit ?? 50,
              ...{ [`${titleField}.contains.i`]: query },
            },
            {
              signal,
            }
          );
          return response.data.items;
        })
      );
    },
    [userOrgApi, query]
  );

  const createRelatedItem = useCallback(
    async (title: string) => {
      const created = (
        await relatedEntityApi.create({
          [titleField]: title,
        })
      ).data.item;
      onChange(options?.multiple ? [...value, created] : created);
      setItems((items) => items && [created, ...items]);
      return created;
    },
    [onChange, options?.multiple, relatedEntityApi, setItems, titleField, value]
  );

  return (
    <SelectInput
      valueKey={(v) => v.id}
      multiple={options?.multiple}
      label={field.label}
      value={value}
      onChange={onChange}
      query={query}
      onQuery={setQuery}
      onCreateFromQuery={createRelatedItem}
      options={items}
      renderOption={(option) => option?.[titleField] as string}
    />
  );
};
