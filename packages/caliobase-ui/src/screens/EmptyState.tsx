import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import indefinite from 'indefinite';
import { useContentType } from '../hooks';
import { clsxo } from '../lib/clsxo';

export function EmptyState(props: {
  onCreateClick?: () => void;
  contentType: string;
}) {
  const {
    label: { singular, plural },
  } = useContentType(props.contentType);

  return (
    <div className="py-16 flex flex-col items-center content-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="font-normal text-base text-gray-400 leading-tight text-center">
          No {plural} Found
        </div>
        <div className="font-semibold text-lg text-gray-400 leading-tight text-center">
          Create {indefinite(singular)} or broaden your search criteria
        </div>
      </div>

      <button
        onClick={props.onCreateClick}
        className={clsxo(
          `flex items-center gap-2`,
          `border text-sm font-bold px-4 py-2 rounded`,
          'bg-transparent border-gray-300 text-gray-400 hover:bg-gray-100'
        )}
      >
        <FontAwesomeIcon icon={faPlus} />
        <span className="whitespace-nowrap">Create {singular}</span>
      </button>
    </div>
  );
}
