import { useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { AppDataState, NotificationType } from '@/types/domain';

type AddNotification = (title: string, message: string, type?: NotificationType) => void;

const DEFAULT_INITIALIZED_COLLECTIONS = {
  tasks: false,
  maintenance: false,
  damageReports: false,
  reservations: false,
};

export function useOperationalAlerts(
  user: User | null,
  appData: AppDataState,
  addNotification: AddNotification,
) {
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const initializedCollectionsRef = useRef({ ...DEFAULT_INITIALIZED_COLLECTIONS });

  useEffect(() => {
    if (!user) {
      notifiedIdsRef.current.clear();
      initializedCollectionsRef.current = { ...DEFAULT_INITIALIZED_COLLECTIONS };
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const syncCollectionNotifications = <T extends { id: string }>(
      items: T[],
      collectionKey: keyof typeof DEFAULT_INITIALIZED_COLLECTIONS,
      getNotificationKey: (item: T) => string | null,
      emit: (item: T) => void,
    ) => {
      if (!initializedCollectionsRef.current[collectionKey]) {
        items.forEach((item) => {
          const key = getNotificationKey(item);
          if (key) {
            notifiedIdsRef.current.add(key);
          }
        });
        initializedCollectionsRef.current[collectionKey] = true;
        return;
      }

      items.forEach((item) => {
        const key = getNotificationKey(item);
        if (key && !notifiedIdsRef.current.has(key)) {
          notifiedIdsRef.current.add(key);
          emit(item);
        }
      });
    };

    syncCollectionNotifications(
      appData.tasks,
      'tasks',
      (task) => {
        if (task.status === 'completed' || !task.dueDate) {
          return null;
        }

        return new Date(task.dueDate) < new Date() ? `task-overdue-${task.id}` : null;
      },
      (task) => {
        addNotification('Overdue task', `Task "${task.title}" is overdue.`, 'warning');
      },
    );

    syncCollectionNotifications(
      appData.maintenance,
      'maintenance',
      (entry) => {
        if (entry.status !== 'scheduled' || !entry.date) {
          return null;
        }

        const maintenanceDate = new Date(entry.date);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 3);
        return maintenanceDate >= new Date() && maintenanceDate <= cutoff ? `maintenance-upcoming-${entry.id}` : null;
      },
      (entry) => {
        addNotification('Upcoming maintenance', `Vehicle ${entry.vehicleId} is scheduled for service soon.`, 'info');
      },
    );

    syncCollectionNotifications(
      appData.damageReports,
      'damageReports',
      (report) => (report.status === 'pending' ? `damage-pending-${report.id}` : null),
      (report) => {
        addNotification('New damage report', `Damage reported for vehicle ${report.vehicleId} needs review.`, 'error');
      },
    );

    syncCollectionNotifications(
      appData.reservations,
      'reservations',
      (reservation) => (reservation.status === 'confirmed' ? `reservation-confirmed-${reservation.id}` : null),
      (reservation) => {
        addNotification(
          'New reservation',
          `Reservation ${reservation.id.slice(0, 6)} confirmed for ${reservation.customerName || 'a customer'}.`,
          'success',
        );
      },
    );
  }, [
    addNotification,
    appData.damageReports,
    appData.maintenance,
    appData.reservations,
    appData.tasks,
    user,
  ]);
}
