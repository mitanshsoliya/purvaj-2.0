import React from 'react';
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  CheckCheck,
  XCircle,
  AlertTriangle,
  Phone,
  Calendar,
  Warehouse,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

/**
 * PURVAJ 2.0 - Order Progress Tracker
 * Visual wholesale fulfillment pipeline:
 * 1. Order Placed (ઓર્ડર મોકલ્યો)
 * 2. Confirmed by Purvaj / Admin (પુર્વજ દ્વારા કન્ફર્મ)
 * 3. Packed & Ready (પેકિંગ તૈયાર)
 * 4. Out for Delivery (ડિલિવરી માટે નીકળ્યો)
 * 5. Delivered (દુકાને પહોંચી ગયો)
 */

export const ORDER_STAGES = [
  {
    key: 'placed',
    title: 'Order Placed',
    titleGuj: 'ઓર્ડર મોકલ્યો',
    description: 'Order received at central warehouse',
    icon: Clock,
    color: 'amber',
  },
  {
    key: 'confirmed',
    title: 'Confirmed by Admin',
    titleGuj: 'પુર્વજ દ્વારા કન્ફર્મ',
    description: 'Wholesale order accepted & stock reserved',
    icon: ShieldCheck,
    color: 'blue',
  },
  {
    key: 'packed',
    title: 'Packed & Boxed',
    titleGuj: 'પેકિંગ તૈયાર',
    description: 'Items packed in warehouse cartons',
    icon: Package,
    color: 'indigo',
  },
  {
    key: 'out_for_delivery',
    title: 'Out for Delivery',
    titleGuj: 'ડિલિવરી માટે નીકળ્યો',
    description: 'Assigned to delivery vehicle & en route',
    icon: Truck,
    color: 'purple',
  },
  {
    key: 'delivered',
    title: 'Delivered to Shop',
    titleGuj: 'દુકાને પહોંચી ગયો',
    description: 'Order received & verified at retail shop',
    icon: CheckCheck,
    color: 'emerald',
  },
];

/**
 * Determine active stage index (0 to 4), or -1 if cancelled
 */
export const getActiveStageIndex = (order) => {
  if (!order) return 0;
  const status = (order.order_status || '').toLowerCase();
  const deliveryStatus = (order.delivery_status || '').toUpperCase();

  if (status === 'cancelled' || deliveryStatus === 'CANCELLED') {
    return -1;
  }
  if (status === 'delivered' || deliveryStatus === 'DELIVERED') {
    return 4;
  }
  if (status === 'dispatched' || deliveryStatus === 'OUT_FOR_DELIVERY') {
    return 3;
  }
  if (status === 'packed' || deliveryStatus === 'PACKED' || status === 'processing' || deliveryStatus === 'PROCESSING') {
    return 2;
  }
  if (status === 'confirmed' || deliveryStatus === 'CONFIRMED') {
    return 1;
  }
  return 0; // pending / ordered
};

/**
 * Format timestamp nicely
 */
const formatTime = (ts) => {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
};

export const OrderProgressTracker = ({
  order,
  timeline,
  variant = 'compact', // 'compact' | 'full'
  className = '',
}) => {
  if (!order) return null;

  const activeIndex = getActiveStageIndex(order);
  const isCancelled = activeIndex === -1;

  // Derive driver info if present
  const driverName = order.driver_name || timeline?.order?.driver_name || timeline?.latest_history?.driver_name;
  const driverMobile = order.driver_mobile || timeline?.order?.driver_mobile || timeline?.latest_history?.driver_mobile;
  const vehicleNumber = order.vehicle_number || timeline?.order?.vehicle_number || timeline?.latest_history?.vehicle_number;

  // Extract stage timestamps
  const getStageTimestamp = (stageKey, index) => {
    if (index > activeIndex && !isCancelled) return null;

    if (stageKey === 'placed') return formatTime(order.created_at);
    if (stageKey === 'confirmed') return formatTime(order.confirmed_at || (activeIndex >= 1 ? order.updated_at : null));
    if (stageKey === 'packed') return formatTime(order.packed_at || (activeIndex >= 2 ? order.updated_at : null));
    if (stageKey === 'out_for_delivery') return formatTime(order.dispatched_at || (activeIndex >= 3 ? order.updated_at : null));
    if (stageKey === 'delivered') return formatTime(order.delivered_date || order.delivered_at || (activeIndex >= 4 ? order.updated_at : null));
    return null;
  };

  // -------------------------------------------------------------
  // CANCELLED STATE
  // -------------------------------------------------------------
  if (isCancelled) {
    return (
      <div className={`p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 ${className}`}>
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold text-xs">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>This order was cancelled (ઓર્ડર રદ કરવામાં આવ્યો છે)</span>
        </div>
        {order.cancellation_reason && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 pl-6">
            Reason: {order.cancellation_reason}
          </p>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // COMPACT VARIANT (For Order Cards in Lists & Dashboard)
  // -------------------------------------------------------------
  if (variant === 'compact') {
    const currentStage = ORDER_STAGES[activeIndex] || ORDER_STAGES[0];
    const progressPercent = Math.min(100, Math.max(10, ((activeIndex) / (ORDER_STAGES.length - 1)) * 100));

    return (
      <div className={`space-y-2.5 ${className}`}>
        {/* Top Status Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {currentStage.title}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              ({currentStage.titleGuj})
            </span>
          </div>
          <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
            Step {activeIndex + 1} of 5
          </span>
        </div>

        {/* Multi-step progress bar */}
        <div className="relative">
          {/* Background track line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
          
          {/* Active progress track */}
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500 via-brand-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Stepper Dots */}
          <div className="relative flex justify-between items-center">
            {ORDER_STAGES.map((stage, idx) => {
              const isPassed = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              const Icon = stage.icon;

              return (
                <div key={stage.key} className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isPassed
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-200 dark:ring-emerald-950'
                        : isCurrent
                        ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950 scale-110 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400'
                    }`}
                    title={`${stage.title} (${stage.titleGuj})`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 hidden md:block max-w-[70px] text-center truncate ${
                      isCurrent
                        ? 'font-bold text-brand-600 dark:text-brand-400'
                        : isPassed
                        ? 'font-medium text-slate-600 dark:text-slate-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current status explanation footer */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
          <span className="truncate">
            {activeIndex === 0 && '⏳ Waiting for Purvaj Admin to review & confirm order'}
            {activeIndex === 1 && '✅ Confirmed by Purvaj Admin — Warehouse packing in progress'}
            {activeIndex === 2 && '📦 Order is packed & ready in warehouse'}
            {activeIndex === 3 && (driverName ? `🚚 On delivery vehicle with ${driverName}` : '🚚 Dispatched for delivery to your shop')}
            {activeIndex === 4 && '🎉 Successfully delivered to your shop'}
          </span>
          {getStageTimestamp(currentStage.key, activeIndex) && (
            <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2 font-mono">
              {getStageTimestamp(currentStage.key, activeIndex)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL VARIANT (For Order Detail Drawer / Modal)
  // -------------------------------------------------------------
  const currentStage = ORDER_STAGES[activeIndex] || ORDER_STAGES[0];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Live Status Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 p-4 text-white shadow-soft">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm">
                Live Status: Step {activeIndex + 1} of 5
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h3 className="text-base font-extrabold mt-1">
              {currentStage.title}
            </h3>
            <p className="text-xs text-brand-100 font-medium mt-0.5">
              {currentStage.titleGuj} • {currentStage.description}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
            {React.createElement(currentStage.icon, { className: 'w-6 h-6 text-white' })}
          </div>
        </div>

        {/* Driver reference if out for delivery */}
        {(driverName || driverMobile || vehicleNumber) && (
          <div className="relative z-10 mt-3 pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {driverName && (
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-brand-200" />
                <span>Driver: <strong>{driverName}</strong></span>
              </div>
            )}
            {driverMobile && (
              <a
                href={`tel:${driverMobile}`}
                className="flex items-center gap-1.5 text-brand-100 hover:text-white underline font-mono"
              >
                <Phone className="w-3.5 h-3.5 text-brand-200" />
                <span>{driverMobile} (Call Driver)</span>
              </a>
            )}
            {vehicleNumber && (
              <div className="flex items-center gap-1.5 text-brand-200">
                <Truck className="w-3.5 h-3.5" />
                <span>Vehicle: <strong className="text-white">{vehicleNumber}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Ambient background decoration */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />
      </div>

      {/* Detailed Vertical Pipeline Stepper */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-between">
          <span>Order Timeline & Verification</span>
          <span className="text-[11px] font-normal text-slate-400">Single Central Warehouse</span>
        </h4>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {ORDER_STAGES.map((stage, idx) => {
            const isPassed = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isFuture = idx > activeIndex;
            const timestamp = getStageTimestamp(stage.key, idx);
            const Icon = stage.icon;

            return (
              <div key={stage.key} className="relative group">
                {/* Node icon / indicator */}
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isPassed
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                      : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950 animate-pulse'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Icon className="w-2.5 h-2.5" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-brand-600 dark:text-brand-400'
                          : isPassed
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {stage.title}
                      <span className="text-[10px] font-normal text-slate-400 ml-1.5 hidden sm:inline">
                        ({stage.titleGuj})
                      </span>
                    </p>

                    {timestamp && (
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {timestamp}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {stage.description}
                  </p>

                  {/* Stage-specific contextual notes */}
                  {isCurrent && stage.key === 'placed' && (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                      ⚡ <strong>Waiting for Purvaj Confirmation:</strong> Admin is reviewing order items and checking available warehouse stock.
                    </div>
                  )}

                  {isCurrent && stage.key === 'confirmed' && (
                    <div className="mt-1.5 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300">
                      ✅ <strong>Confirmed by Warehouse:</strong> Purvaj Admin has approved your order. Warehouse team has begun packing.
                    </div>
                  )}

                  {isCurrent && stage.key === 'out_for_delivery' && (
                    <div className="mt-1.5 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 text-[11px] text-purple-800 dark:text-purple-300">
                      🚚 <strong>En Route:</strong> Goods are in transit. Please ensure staff is available at the shop to receive delivery.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderProgressTracker;
