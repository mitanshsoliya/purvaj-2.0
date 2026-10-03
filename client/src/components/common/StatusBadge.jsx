import React from 'react';

const statusConfig = {
  // Orders
  pending: { label: 'Pending', color: 'amber' },
  confirmed: { label: 'Confirmed', color: 'sky' },
  processing: { label: 'Processing', color: 'blue' },
  dispatched: { label: 'Dispatched', color: 'indigo' },
  delivered: { label: 'Delivered', color: 'emerald' },
  cancelled: { label: 'Cancelled', color: 'rose' },
  returned: { label: 'Returned', color: 'slate' },
  completed: { label: 'Completed', color: 'emerald' },
  on_hold: { label: 'On Hold', color: 'amber' },

  // Shops
  active: { label: 'Active', color: 'emerald' },
  blocked: { label: 'Blocked', color: 'rose' },
  pending_approval: { label: 'Pending Approval', color: 'amber' },
  approved: { label: 'Approved', color: 'emerald' },
  rejected: { label: 'Rejected', color: 'rose' },

  // Payments / Billing
  paid: { label: 'Paid', color: 'emerald' },
  partially_paid: { label: 'Partially Paid', color: 'amber' },
  unpaid: { label: 'Unpaid', color: 'rose' },
  overdue: { label: 'Overdue', color: 'rose' },
  draft: { label: 'Draft', color: 'slate' },
  refunded: { label: 'Refunded', color: 'purple' },

  // Stock
  in_stock: { label: 'In Stock', color: 'emerald' },
  low_stock: { label: 'Low Stock', color: 'amber' },
  out_of_stock: { label: 'Out of Stock', color: 'rose' },
};

const colorStyles = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  sky: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
  slate: 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
};

const dotColors = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
  purple: 'bg-purple-500',
};

export const StatusBadge = ({
  status,
  label,
  color,
  size = 'sm',
  showDot = true,
  className = '',
}) => {
  const normStatus = (status || '').toLowerCase().replace(/[\s-]/g, '_');
  const matched = statusConfig[normStatus];

  const resolvedColor = color || (matched ? matched.color : 'slate');
  const resolvedLabel = label || (matched ? matched.label : (status ? status.replace(/_/g, ' ') : 'Unknown'));

  const sizeClasses = size === 'xs'
    ? 'text-[11px] px-2 py-0.5 font-medium'
    : size === 'md'
    ? 'text-xs px-3 py-1 font-semibold'
    : 'text-xs px-2.5 py-0.5 font-medium';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border shadow-soft-2xs
        ${sizeClasses}
        ${colorStyles[resolvedColor] || colorStyles.slate}
        ${className}
      `}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[resolvedColor] || dotColors.slate}`}
          aria-hidden="true"
        />
      )}
      <span className="capitalize">{resolvedLabel}</span>
    </span>
  );
};

export default StatusBadge;
