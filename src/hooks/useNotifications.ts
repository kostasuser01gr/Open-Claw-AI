import { useState } from 'react';
import { createId } from '@/lib/id';
import type { AppNotification, NotificationType } from '@/types/domain';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismissNotification = (id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  const addNotification = (
    title: string,
    message: string,
    type: NotificationType = 'info',
    durationMs = 5000,
  ) => {
    const id = createId('notice');
    setNotifications((current) =>
      [{ id, title, message, type, time: new Date().toISOString() }, ...current].slice(0, 5),
    );

    window.setTimeout(() => {
      dismissNotification(id);
    }, durationMs);
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
  };
}
