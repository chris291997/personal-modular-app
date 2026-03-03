import { useState } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'success' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean; // Optional external loading state
}

const variantConfig: Record<
  ConfirmVariant,
  { icon: typeof AlertTriangle; confirmClass: string; iconBg: string }
> = {
  danger: {
    icon: Trash2,
    confirmClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  },
  success: {
    icon: CheckCircle2,
    confirmClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    iconBg: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  },
  warning: {
    icon: AlertTriangle,
    confirmClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    confirmClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading: externalLoading = false,
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading || internalLoading;

  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Parent handles error (e.g. alert); keep modal open for retry
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="flex items-start gap-3 md:gap-4">
          <div
            className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${config.iconBg}`}
          >
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-title"
              className="text-base md:text-lg font-semibold text-gray-900 dark:text-white"
            >
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium text-sm transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 ${config.confirmClass}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
