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

  // Shops
  active: { label: 'Active', color: 'emerald' },
  blocked: { label: 'Blocked', color: 'rose' },
  pending_approval: { label: 'Pending Approval', color: 'amber' },

  // Payments / Billing
  paid: { label: 'Paid', color: 'emerald' },
  partially_paid: { label: 'Partially Paid', color: 'amber' },
  unpaid: { label: 'Unpaid', color: 'rose' },
  overdue: { label: 'Overdue', color: 'rose' },
  draft: { label: 'Draft', color: 'slate' },

  // Stock
  in_stock: { label: 'In Stock', color: 'emerald' },
  low_stock: { label: 'Low Stock', color: 'amber' },
  out_of_stock: { label: 'Out of Stock', color: 'rose' },
};

const colorStyles = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold',
  sky: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700 font-bold',
  blue: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700 font-bold',
  amber: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold',
  rose: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 font-bold',
  slate: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-bold',
  purple: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700 font-bold',
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
  const resolvedLabel = label || (matched ? matched.label : status || 'Unknown');

  const sizeClasses = size === 'xs'
    ? 'text-[11px] px-2 py-0.5'
    : size === 'md'
    ? 'text-xs px-3 py-1 font-semibold'
    : 'text-xs px-2.5 py-0.5 font-medium';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border
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
