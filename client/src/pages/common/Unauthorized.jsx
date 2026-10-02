import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';

export const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, switchRole } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-soft">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
        Access Restricted
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
        Unauthorized Role Area
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
        Your current session is signed in as <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{user?.role || 'Guest'}</span>.
        To access this section, please switch to Admin credentials or return to Shop Portal.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="primary"
          icon={ShieldCheck}
          onClick={() => {
            switchRole('admin');
            navigate('/admin');
          }}
        >
          Open Admin Dashboard
        </Button>
        <Button
          variant="outline"
          icon={Store}
          onClick={() => {
            switchRole('shop');
            navigate('/shop');
          }}
        >
          Return to Shop Portal
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;
