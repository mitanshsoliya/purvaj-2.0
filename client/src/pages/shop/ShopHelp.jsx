import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Warehouse,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Send,
  HelpCircle,
  Truck,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const FAQS = [
  {
    q: 'What are the delivery cutoff timings for wholesale orders?',
    a: 'All wholesale orders confirmed before 2:00 PM Monday through Saturday are dispatched the same day from our Central Warehouse. Orders placed after 2:00 PM are dispatched the next business morning.',
  },
  {
    q: 'How does the Wholesale Udhaar (Credit) cycle work?',
    a: 'Approved retail stores are assigned a credit limit (e.g. ₹2,50,000) with a 15-day payment cycle. Once an order is placed on credit, the invoice amount is debited from your available limit. Payments made via NEFT or cash immediately restore your available credit balance.',
  },
  {
    q: 'What should I do if a carton has damaged or broken items?',
    a: 'Please inspect goods at the time of delivery. If any carton is damaged, take a photo and submit a claim through the "Report an Issue" form below with your Order ID, or inform the delivery driver to note it on the delivery gate-pass. A credit note will be issued to your shop ledger.',
  },
  {
    q: 'Why am I seeing a Minimum Order Quantity (MOQ) notice?',
    a: 'As a B2B wholesale platform, products are priced at wholesale carton rates rather than single consumer units. MOQ ensures you get the highest margin bulk tier rates.',
  },
];

export const ShopHelp = () => {
  const { addToast } = useToast();
  const [openFaq, setOpenFaq] = useState(null);

  // Report Issue Form
  const [issueType, setIssueType] = useState('damaged_goods');
  const [orderRef, setOrderRef] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const handleSubmitIssue = (e) => {
    e.preventDefault();
    if (!issueDescription) return;

    setSubmittingIssue(true);
    setTimeout(() => {
      setSubmittingIssue(false);
      addToast('Support ticket submitted. Warehouse dispatch team will contact you shortly.', 'success');
      setOrderRef('');
      setIssueDescription('');
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-600 text-white shadow-soft">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Help & Retailer Support
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Direct assistance from the Purvaj Wholesale Central Operations & Dispatch Desk
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Support Card */}
        <Card title="Direct Warehouse Contacts" subtitle="Central operations & vehicle dispatch">
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Dispatch Helpline</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">+91 97240 06035</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">WhatsApp Order Support</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">+91 97240 06035</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Accounts & Billing Email</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">support@purvaj.com</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Warehouse Operating Hours</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">Mon - Sat: 8:00 AM - 8:30 PM</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Report an Issue / Raise Ticket Form */}
        <Card title="Report an Issue" subtitle="File claims for damaged cartons, missing items, or delivery delays">
          <form onSubmit={handleSubmitIssue} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Issue Category
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="damaged_goods">Damaged Goods / Broken Carton</option>
                <option value="missing_items">Missing Items in Shipment</option>
                <option value="delivery_delay">Delivery Vehicle Delay</option>
                <option value="billing_query">Billing / Invoice Discrepancy</option>
                <option value="credit_limit">Request Credit Limit Increase</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Order / Invoice Reference (Optional)
              </label>
              <input
                type="text"
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
                placeholder="e.g. ORD-20261002-XXXX or INV-0001"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Describe the Issue
              </label>
              <textarea
                rows={3}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                required
                placeholder="Provide details about the issue or carton batch number..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Send}
              disabled={submittingIssue}
              className="w-full font-bold shadow-soft"
            >
              {submittingIssue ? 'Submitting Ticket...' : 'Submit Support Request'}
            </Button>
          </form>
        </Card>
      </div>

      {/* Frequently Asked Questions Accordion */}
      <Card title="Frequently Asked Wholesale Questions" subtitle="Important policies on deliveries, credit, and orders">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="py-3">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-brand-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {openFaq === idx && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-6">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ShopHelp;
