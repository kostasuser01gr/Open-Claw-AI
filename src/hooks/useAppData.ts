import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import {
  isStaffRole,
  normalizeContract,
  normalizeCustomer,
  normalizeDamageReport,
  normalizeMaintenanceRecord,
  normalizePricingRule,
  normalizeReservation,
  normalizeTask,
  normalizeUserProfile,
  normalizeVehicle,
} from '@/lib/normalize';
import type { AppDataState, NotificationType } from '@/types/domain';

function createEmptyState(): AppDataState {
  return {
    userProfile: null,
    fleet: [],
    reservations: [],
    customers: [],
    tasks: [],
    maintenance: [],
    damageReports: [],
    pricingRules: [],
    contracts: [],
    isStaff: false,
  };
}

const PAGE_SIZE = 50;

export interface PaginationState {
  hasMore: Record<CollectionStateKey, boolean>;
  loading: Record<CollectionStateKey, boolean>;
}

type CollectionStateKey = Exclude<keyof AppDataState, 'userProfile' | 'isStaff'>;
type AddNotification = (title: string, message: string, type?: NotificationType) => void;
type CollectionDefinition<TKey extends CollectionStateKey> = {
  key: TKey;
  title: string;
  path: string;
  constraints: () => QueryConstraint[];
  normalize: (id: string, value: unknown) => AppDataState[TKey][number];
  enabled?: boolean;
};

function createEmptyStaffCollections(): Pick<
  AppDataState,
  'customers' | 'tasks' | 'maintenance' | 'damageReports' | 'pricingRules' | 'contracts'
> {
  return {
    customers: [],
    tasks: [],
    maintenance: [],
    damageReports: [],
    pricingRules: [],
    contracts: [],
  };
}

function buildCollectionDefinitions(user: User, isStaff: boolean): Array<CollectionDefinition<CollectionStateKey>> {
  return [
    {
      key: 'fleet',
      title: 'Vehicle data unavailable',
      path: 'vehicles',
      constraints: () => [limit(PAGE_SIZE)],
      normalize: normalizeVehicle,
    },
    {
      key: 'reservations',
      title: 'Reservation data unavailable',
      path: 'reservations',
      constraints: () =>
        isStaff
          ? [orderBy('pickupDate', 'desc'), limit(PAGE_SIZE)]
          : [where('customerId', '==', user.uid), limit(PAGE_SIZE)],
      normalize: normalizeReservation,
    },
    {
      key: 'customers',
      title: 'Customer data unavailable',
      path: 'customers',
      constraints: () => [limit(PAGE_SIZE)],
      normalize: normalizeCustomer,
      enabled: isStaff,
    },
    {
      key: 'tasks',
      title: 'Task data unavailable',
      path: 'tasks',
      constraints: () => [orderBy('dueDate', 'asc'), limit(PAGE_SIZE)],
      normalize: normalizeTask,
      enabled: isStaff,
    },
    {
      key: 'maintenance',
      title: 'Maintenance data unavailable',
      path: 'maintenance',
      constraints: () => [orderBy('date', 'desc'), limit(PAGE_SIZE)],
      normalize: normalizeMaintenanceRecord,
      enabled: isStaff,
    },
    {
      key: 'damageReports',
      title: 'Damage report data unavailable',
      path: 'damage_reports',
      constraints: () => [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)],
      normalize: normalizeDamageReport,
      enabled: isStaff,
    },
    {
      key: 'pricingRules',
      title: 'Pricing rule data unavailable',
      path: 'pricing_rules',
      constraints: () => [limit(PAGE_SIZE)],
      normalize: normalizePricingRule,
      enabled: isStaff,
    },
    {
      key: 'contracts',
      title: 'Contract data unavailable',
      path: 'contracts',
      constraints: () => [orderBy('signedAt', 'desc'), limit(PAGE_SIZE)],
      normalize: normalizeContract,
      enabled: isStaff,
    },
  ];
}

export function useAppData(user: User | null, addNotification: AddNotification) {
  const [state, setState] = useState<AppDataState>(() => createEmptyState());
  const [cursors, setCursors] = useState<Record<string, DocumentSnapshot | null>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    hasMore: {} as Record<CollectionStateKey, boolean>,
    loading: {} as Record<CollectionStateKey, boolean>,
  });

  const clearData = () => {
    setState(createEmptyState());
    setCursors({});
    setPagination({ hasMore: {} as Record<CollectionStateKey, boolean>, loading: {} as Record<CollectionStateKey, boolean> });
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const profile = snapshot.exists()
          ? normalizeUserProfile(snapshot.id, snapshot.data(), user.email)
          : {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || undefined,
              role: 'customer' as const,
            };

        setState((current) => ({
          ...current,
          userProfile: profile,
          isStaff: isStaffRole(profile.role),
          ...(isStaffRole(profile.role) ? {} : createEmptyStaffCollections()),
        }));
      },
      (error) => {
        const appError = handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        addNotification('Profile access issue', appError.userMessage, 'warning');
        setState((current) => ({
          ...current,
          userProfile: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || undefined,
            role: 'customer',
          },
          isStaff: false,
        }));
      },
    );

    return () => unsubscribe();
  }, [user, addNotification]);

  useEffect(() => {
    if (!user || !state.userProfile) {
      return;
    }

    const unsubscribers: Array<() => void> = [];
    const reportError = (title: string, operationType: OperationType, path: string) => (error: unknown) => {
      const appError = handleFirestoreError(error, operationType, path);
      addNotification(title, appError.userMessage, 'error');
    };

    buildCollectionDefinitions(user, state.isStaff).forEach((definition) => {
      if (definition.enabled === false) {
        return;
      }

      const q = query(collection(db, definition.path), ...definition.constraints());

      unsubscribers.push(
        onSnapshot(
          q,
          (snapshot) => {
            const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
            setCursors((prev) => ({ ...prev, [definition.key]: lastDoc }));
            setPagination((prev) => ({
              ...prev,
              hasMore: { ...prev.hasMore, [definition.key]: snapshot.docs.length >= PAGE_SIZE },
            }));

            setState((current) => ({
              ...current,
              [definition.key]: snapshot.docs.map((entry) =>
                definition.normalize(entry.id, entry.data()),
              ) as AppDataState[typeof definition.key],
            }));
          },
          reportError(definition.title, OperationType.LIST, definition.path),
        ),
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user, state.isStaff, state.userProfile, addNotification]);

  const loadMore = useCallback(async (key: CollectionStateKey) => {
    if (!user || !state.userProfile) return;
    const cursor = cursors[key];
    if (!cursor) return;

    setPagination((prev) => ({
      ...prev,
      loading: { ...prev.loading, [key]: true },
    }));

    const definitions = buildCollectionDefinitions(user, state.isStaff);
    const def = definitions.find((d) => d.key === key);
    if (!def) return;

    try {
      const q = query(collection(db, def.path), ...def.constraints().filter((c) => !(c as { type?: string }).type || (c as { type?: string }).type !== 'limit'), startAfter(cursor), limit(PAGE_SIZE));
      const snapshot = await getDocs(q);
      const newItems = snapshot.docs.map((entry) => def.normalize(entry.id, entry.data()));

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setCursors((prev) => ({ ...prev, [key]: lastDoc }));
      setPagination((prev) => ({
        ...prev,
        hasMore: { ...prev.hasMore, [key]: snapshot.docs.length >= PAGE_SIZE },
        loading: { ...prev.loading, [key]: false },
      }));

      setState((current) => ({
        ...current,
        [key]: [...current[key], ...newItems] as AppDataState[typeof key],
      }));
    } catch (error) {
      const appError = handleFirestoreError(error, OperationType.LIST, def.path);
      addNotification(def.title, appError.userMessage, 'error');
      setPagination((prev) => ({
        ...prev,
        loading: { ...prev.loading, [key]: false },
      }));
    }
  }, [user, state.isStaff, state.userProfile, cursors, addNotification]);

  return {
    ...state,
    clearData,
    pagination,
    loadMore,
  };
}
