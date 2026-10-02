import React from 'react';
import { AlertTriangle, AlertCircle, Info, HelpCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  isLoading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: AlertCircle,
      bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      btnVariant: 'danger',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      btnVariant: 'primary',
    },
    info: {
      icon: HelpCircle,
      bg: 'bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400',
      btnVariant: 'primary',
    },
  };

  const current = iconConfig[type] || iconConfig.danger;
  const Icon = current.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showClose={!isLoading}
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={current.btnVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full flex-shrink-0 ${current.bg}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
