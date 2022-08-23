import { PartialComponentApplication } from '../PartialComponentApplication';
import { SelectInput } from '../SelectInput';

export function Pagination<T>({
  list,
  itemsPerPage,
  currentPage,
  onItemsPerPageChange,
  onCurrentPageChange,
  selectPageSizeOptions = [10, 25, 50, 100],
}: {
  list: { items: T[]; count?: number };
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  currentPage: number;
  onCurrentPageChange: (page: number) => void;
  selectPageSizeOptions?: number[];
}) {
  const totalPages = Math.ceil((list?.count ?? 0) / itemsPerPage);

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-gray-600">
        <SelectInput
          value={itemsPerPage}
          onChange={onItemsPerPageChange}
          options={selectPageSizeOptions}
          renderOption={(value) => (
            <>
              show <b>{value}</b> items per page
            </>
          )}
        />
      </div>
      <div className="ml-auto text-sm text-gray-500">
        {list.count} total items
      </div>
      <div className="flex items-stretch">
        <PaginationButton
          onClick={() => onCurrentPageChange(0)}
          disabled={currentPage === 0}
        >
          &laquo;
        </PaginationButton>
        <PaginationButton
          onClick={() => onCurrentPageChange(currentPage - 1)}
          disabled={currentPage === 0}
        >
          &lsaquo;
        </PaginationButton>
        <div className="-mr-px flex items-center border bg-gray-100 px-2 py-1 text-xs text-gray-600">
          Page {currentPage + 1} of {totalPages}
        </div>
        <PaginationButton
          onClick={() => onCurrentPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
        >
          &rsaquo;
        </PaginationButton>
        <PaginationButton
          onClick={() => onCurrentPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
        >
          &raquo;
        </PaginationButton>
      </div>
    </div>
  );
}

const PaginationButton: PartialComponentApplication<'button'> = ({
  children,
  ...props
}) => (
  <button
    className="-mr-px border px-2 py-1 text-indigo-900 first:rounded-l last:rounded-r enabled:hover:bg-gray-100 disabled:text-gray-300"
    {...props}
  >
    <div className="-mt-[0.125em]">{children}</div>
  </button>
);
