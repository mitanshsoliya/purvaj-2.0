import React from 'react';
import { 
  Construction, 
  Database, 
  ShieldCheck, 
  Workflow, 
  ArrowRight,
  Server
} from 'lucide-react';
import Card from './Card';
import Button from './Button';
import EmptyState from './EmptyState';

export const ModulePlaceholder = ({
  title,
  category = 'Purvaj 2.0 Module',
  description,
  plannedPhase = 'Phase 2 / Phase 3 Implementation',
  apiEndpoint,
  dbTable,
  features = [],
}) => {
  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                {category}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                <Construction className="w-3 h-3" />
                {plannedPhase}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {description || `The ${title} module interface shell is established. Backend domain logic and data schemas will connect here.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg">
              Central Warehouse Single Node
            </span>
          </div>
        </div>
      </div>

      {/* Specifications & Planned Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Module Architecture" subtitle="Backend integration specs">
          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <Server className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">API Route:</span>
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{apiEndpoint || '/api/v1/...'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <Database className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Database Table:</span>
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{dbTable || 'PostgreSQL / Supabase Schema'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Role Authorization:</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">JWT Verified Role Guard</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Planned Wholesale Logic" subtitle="Ready for domain business rules" className="md:col-span-2">
          {features.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              {features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Workflow className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Domain business rules and transactional logic will be implemented in subsequent phases.
            </p>
          )}
        </Card>
      </div>

      {/* Empty State representing No live records loaded */}
      <EmptyState
        title={`No live ${title.toLowerCase()} records loaded`}
        description="This section is connected to the Purvaj 2.0 UI architecture and is awaiting live database synchronization."
      />
    </div>
  );
};

export default ModulePlaceholder;
