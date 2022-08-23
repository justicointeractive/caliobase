import {
  faExternalLinkSquare,
  faPencil,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { get } from 'lodash';
import { createElement } from 'react';
import { ContentField } from '../../lib';
import { asserted } from '../../lib/assert';
import { PartialComponentApplication } from '../PartialComponentApplication';

export function ContentTable<T extends { id: string }>(props: {
  items: T[];
  fields: ContentField<string, any, any>[];
  onEditItem: (item: T) => void;
  onViewItem?: (item: T) => void;
}) {
  const fieldsWithTableCells = props.fields.filter(
    (field) => field.tableCell?.component != null
  );

  return (
    <div className="grid overflow-hidden rounded border bg-gray-100 text-sm">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {fieldsWithTableCells.map((f) => (
            <col key={f.property} style={{ width: f.tableCell?.width }} />
          ))}
          <col style={{ width: '4rem' }} />
        </colgroup>
        <thead className="text-xs font-bold text-gray-500">
          <tr>
            {fieldsWithTableCells.map((field) => (
              <td key={field.property} className="p-3 py-2">
                {field.label}
              </td>
            ))}
            <td className="p-3 py-2"></td>
          </tr>
        </thead>
        <tbody className="bg-gray-50 text-gray-700">
          {props.items.map((item) => (
            <tr
              key={item.id}
              className="group cursor-pointer border-y border-gray-300/20 last:border-b-0  hover:bg-indigo-50"
              onClick={() => props.onEditItem(item)}
            >
              {fieldsWithTableCells.map((field) => (
                <td key={field.property} className="p-3 py-1">
                  {createElement(asserted(field.tableCell?.component), {
                    value: get(item, field.property),
                    field,
                    item,
                    options: field.tableCell?.options ?? {},
                  })}
                </td>
              ))}
              <td className="flex items-center justify-end opacity-0 group-hover:opacity-100">
                <ActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onEditItem(item);
                  }}
                >
                  <FontAwesomeIcon icon={faPencil} />
                </ActionButton>
                {props.onViewItem && (
                  <ActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onViewItem?.(item);
                    }}
                  >
                    <FontAwesomeIcon icon={faExternalLinkSquare} />
                  </ActionButton>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot></tfoot>
      </table>
    </div>
  );
}

const ActionButton: PartialComponentApplication<'button'> = ({
  children,
  ...props
}) => (
  <button
    {...props}
    className={`rounded py-1 px-2 opacity-80 hover:bg-indigo-200`}
  >
    {children}
  </button>
);
