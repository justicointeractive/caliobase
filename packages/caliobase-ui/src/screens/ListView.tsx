import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { concat, of } from 'rxjs';
import { useAsyncEffectState } from 'use-async-effect-state';
import { ContentTable } from '../components/data/ContentTable';
import { Pagination } from '../components/data/Pagination';
import { useContentType } from '../hooks/useContentType';
import { assert } from '../lib/assert';
import { FocusView } from '../patterns/FocusView';
import { EmptyState } from './EmptyState';
import { FullHeightLoader } from './FullScreenLoader';

export function ListView() {
  const { contentType } = useParams();

  assert(contentType);

  const navigate = useNavigate();

  const {
    contentTypeApi,
    fields,
    label: { singular, plural },
    frontEndUrl,
  } = useContentType(contentType);

  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);

  const [list]: readonly [
    { items: { id: string }[]; count?: number } | undefined,
    (value: undefined) => void,
    unknown
  ] = useAsyncEffectState(
    undefined,
    (signal) =>
      concat(
        of(undefined),
        contentTypeApi
          ?.findAll(
            {
              skip: currentPage * itemsPerPage,
              limit: itemsPerPage,
            },
            {
              signal,
            }
          )
          .then((response) => response?.data) ?? [undefined]
      ),
    [contentTypeApi, itemsPerPage, currentPage],
    contentType
  );

  return (
    <FocusView
      preTitle="Content Management"
      title={plural}
      buttons={[
        <NavLink to="./create" className="flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} />
          <span className="whitespace-nowrap">Create {singular}</span>
        </NavLink>,
      ]}
    >
      <div className="rounded bg-gray-50 p-3 shadow-lg">
        <div className="grid gap-3">
          {list?.items ? (
            list.items.length ? (
              <>
                <ContentTable
                  items={list.items}
                  fields={fields}
                  onEditItem={(item) => navigate(`./${item.id}`)}
                  onViewItem={
                    frontEndUrl?.item &&
                    ((item) => window.open(frontEndUrl?.item?.(item), '_blank'))
                  }
                />
                <Pagination
                  list={list}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  onCurrentPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </>
            ) : (
              <EmptyState
                contentType={contentType}
                onCreateClick={() => navigate('./create')}
              />
            )
          ) : (
            <FullHeightLoader className="min-h-[100px]" />
          )}
        </div>
      </div>
    </FocusView>
  );
}
