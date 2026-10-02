import React from 'react';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

export const Table = ({
  columns = [],
  data = [],
  keyExtractor = (row, index) => row.id || index,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data to display.',
  onRowClick,
  className = '',
  pagination,
}) => {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  scope="col"
                  style={{ width: col.width }}
                  className={`
                    px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    ${col.headerClassName || ''}
                  `}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <LoadingState message="Loading table records..." height="h-32" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`
                    transition-colors duration-150
                    hover:bg-slate-50/80 dark:hover:bg-slate-800/40
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`
                        px-4 py-3.5 text-slate-700 dark:text-slate-300 text-sm
                        ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                        ${col.cellClassName || ''}
                      `}
                    >
                      {col.render ? col.render(row[col.key], row, index) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && <div className="border-t border-slate-100 dark:border-slate-800">{pagination}</div>}
    </div>
  );
};

export default Table;
