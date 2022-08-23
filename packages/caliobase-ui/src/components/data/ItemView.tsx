import clsx from 'clsx';
import { groupBy } from 'lodash';
import { ContentField } from '../../lib';
import { Fieldset } from '../Fieldset';

export function ItemView<T extends { id?: string | number }>({
  itemState,
  onItemChange,
  fields,
}: {
  itemState: T;
  onItemChange: (item: T) => void;
  fields: ContentField<string, any, any>[];
}) {
  const { main: mainColumnFields, meta: metaColumnFields } = groupBy(
    fields.filter((field) => field.editor !== null),
    (e) => e.editorColumn ?? 'main'
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className={clsx(
        'grid justify-center gap-5',
        metaColumnFields ? 'grid-cols-[1fr_300px]' : 'grid-cols-1'
      )}
    >
      <div className="ml-12 grid content-start gap-3 rounded bg-gray-50 p-3 shadow-lg">
        <Fieldset
          item={itemState}
          fields={mainColumnFields ?? []}
          onChange={onItemChange}
        />
      </div>
      {metaColumnFields && (
        <div className="grid content-start gap-3 pt-3">
          <Fieldset
            item={itemState}
            fields={metaColumnFields}
            onChange={onItemChange}
          />
        </div>
      )}
    </form>
  );
}
