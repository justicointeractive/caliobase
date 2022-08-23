import { TableCellComponent } from './TableCellComponent';

export const ImageTableCell: TableCellComponent<unknown> = ({ value }) => (
  <div className="relative h-6 w-6 overflow-hidden rounded">
    {value?.objectStorageObject?.cdnUrl ? (
      <img
        src={value?.objectStorageObject?.cdnUrl + '?height=64'}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
    ) : null}
  </div>
);
