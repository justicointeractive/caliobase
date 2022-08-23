import clsx from 'clsx';
import { useApiContext } from '../../context/ApiContext';
import { DetailEditorComponent } from './DetailEditorComponent';

export const RoleDetailEditor: DetailEditorComponent<string[], unknown> = ({
  value,
  field,
  onChange,
}) => {
  const { root } = useApiContext();
  const allRoles = root?.allRoles;
  const checkableRoles = allRoles?.map((role) => ({
    role,
    checked: value.includes(role),
  }));

  return (
    <div className="relative grid bg-gray-50">
      <label
        className={clsx(
          'pointer-events-none absolute bg-gray-50 font-bold text-gray-500 transition-all group-hover:bg-gray-100',
          'left-2 top-1 text-xs'
        )}
      >
        {field.label}
      </label>
      <div className="flex gap-3 rounded border bg-gray-50 p-2 pt-6 pb-1">
        {checkableRoles?.map(({ role, checked }) => (
          <label
            key={role}
            className={clsx(
              'flex cursor-pointer items-center gap-1 rounded-full border py-1 px-2',
              checked
                ? 'border-current bg-indigo-900 text-indigo-50 hover:bg-indigo-900/80'
                : 'border-gray-300 bg-transparent text-gray-600 hover:bg-gray-200/80'
            )}
          >
            <span>{role}</span>
            <input
              className="hidden"
              type="checkbox"
              checked={checked}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, role]
                    : value.filter((fr) => fr !== role)
                )
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
};
