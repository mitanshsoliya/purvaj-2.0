import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Gift,
  Tag,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  Sparkles,
  Percent,
  Calendar
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export const ShopOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopOffers();
  }, []);

  const fetchShopOffers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/offers?active_only=true');
      if (res.data?.success && res.data?.data) {
        setOffers(res.data.data.offers || []);
      }
    } catch (err) {
      console.error('Failed to load shop offers', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500 text-white">
            <Gift className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Exclusive Schemes & Offers
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Wholesale volume schemes targeted specifically for your store. Discounts automatically calculate at checkout.
        </p>
      </div>

      {/* Offers Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Gift className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Active Store Schemes Today
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            New FMCG brand promotional schemes are launched every Monday. In the meantime, enjoy your assigned wholesale contract rates.
          </p>
          <Link to="/shop/products" className="inline-block mt-4">
            <Button variant="primary" size="sm" icon={Package}>
              Browse Wholesale Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {offers.map((offer) => {
            const isPercent = offer.discount_type === 'percentage';
            const discValue = parseFloat(offer.discount_value);
            const minBasket = parseFloat(offer.minimum_order_value || 0);

            return (
              <div
                key={offer.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-500/20 dark:border-amber-500/30 p-5 shadow-soft hover:shadow-soft-md transition-all flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                <div>
                  {/* Top Badge & Discount */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-soft-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {isPercent ? `${discValue}% OFF` : `₹${discValue} FLAT DISCOUNT`}
                    </span>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Ends {new Date(offer.end_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {offer.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {offer.description || 'Exclusive wholesale trade discount applicable on carton consignments.'}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                    {minBasket > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Minimum Order Value:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{minBasket.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Target Store:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Eligible for your account
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Auto-applied in cart
                  </span>

                  <Link to="/shop/products">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ArrowRight}
                      iconPosition="right"
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    >
                      Shop Scheme
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShopOffers;
