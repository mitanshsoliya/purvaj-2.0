import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import Button from '../../components/common/Button';

export const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-soft">
        <FileQuestion className="w-8 h-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1">
        Error 404
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
        The route you are looking for does not exist in the Purvaj 2.0 B2B platform.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link to="/admin">
          <Button variant="primary" icon={Home}>
            Admin Dashboard
          </Button>
        </Link>
        <Link to="/shop">
          <Button variant="outline">
            Shop Portal
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
