/**
 * Centralized design tokens for Purvaj 2.0
 * Professional B2B Wholesale Platform
 */
export const tokens = {
  brand: {
    name: 'Purvaj 2.0',
    shortName: 'Purvaj',
    tagline: 'B2B Wholesale Ordering & Enterprise Platform',
    warehouse: 'Main Central Warehouse', // Single warehouse
  },
  colors: {
    primary: {
      light: '#3b82f6',
      DEFAULT: '#2563eb', // Professional blue accent
      dark: '#1d4ed8',
      darker: '#1e40af',
    },
    sidebar: {
      bg: '#0f172a', // Dark navy
      bgDark: '#0a0f1d',
      hover: '#1e293b',
      active: '#2563eb',
      border: '#1e293b',
      text: '#cbd5e1',
      textMuted: '#64748b',
      textActive: '#ffffff',
    },
    workspace: {
      lightBg: '#f8fafc',
      darkBg: '#0b0f19',
      lightCard: '#ffffff',
      darkCard: '#111827',
      lightBorder: '#e2e8f0',
      darkBorder: '#1f2937',
    },
    status: {
      success: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      },
      warning: {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
      },
      danger: {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500',
      },
      info: {
        bg: 'bg-sky-50 dark:bg-sky-950/40',
        text: 'text-sky-700 dark:text-sky-300',
        border: 'border-sky-200 dark:border-sky-800',
        dot: 'bg-sky-500',
      },
      secondary: {
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500',
      },
      neutral: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
      },
    },
  },
  shadows: {
    card: 'shadow-soft border border-slate-200/80 dark:border-slate-800',
    cardHover: 'hover:shadow-soft-md transition-shadow duration-200',
    dropdown: 'shadow-soft-lg border border-slate-200 dark:border-slate-800',
  },
  radii: {
    card: 'rounded-xl',
    button: 'rounded-lg',
    input: 'rounded-lg',
    badge: 'rounded-full',
  },
};
