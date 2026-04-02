import { AlertCircle, Briefcase, CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types/domain';

interface NotificationStackProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationStack({ notifications, onDismiss }: NotificationStackProps) {
  return (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={cn(
              'glass-card p-4 rounded-2xl w-80 pointer-events-auto flex gap-3',
              notification.type === 'error' && 'border-red-500/30',
              notification.type === 'success' && 'border-green-500/30',
              notification.type === 'warning' && 'border-orange-500/30',
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                notification.type === 'error'
                  ? 'bg-red-500/10 text-red-500'
                  : notification.type === 'success'
                    ? 'bg-green-500/10 text-green-500'
                    : notification.type === 'warning'
                      ? 'bg-orange-500/10 text-orange-500'
                      : 'bg-blue-500/10 text-blue-500',
              )}
            >
              {notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : notification.type === 'warning' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Briefcase className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-widest">{notification.title}</h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{notification.message}</p>
            </div>
            <button onClick={() => onDismiss(notification.id)} className="text-text-muted hover:text-text">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
