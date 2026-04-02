import { useState } from 'react';
import { AlertCircle, Calendar, Check, Clock, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppDataState, NotificationType, Reservation } from '@/types/domain';
import { ReservationEditModal } from './ReservationEditModal';
import { StatCard } from './StatCard';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-500/10 text-blue-500',
  pending: 'bg-orange-500/10 text-orange-500',
  cancelled: 'bg-red-500/10 text-red-500',
  confirmed: 'bg-cyan-500/10 text-cyan-500',
  completed: 'bg-green-500/10 text-green-500',
};

interface ReservationsModuleProps {
  reservations: AppDataState['reservations'];
  isStaff?: boolean;
  onUpdateReservation?: (updated: Reservation) => void;
  onNotify?: (title: string, message: string, type?: NotificationType) => void;
}

export function ReservationsModule({ reservations, isStaff, onUpdateReservation, onNotify }: ReservationsModuleProps) {
  const [editing, setEditing] = useState<Reservation | null>(null);

  const handleSave = (updated: Reservation) => {
    onUpdateReservation?.(updated);
    onNotify?.('Reservation updated', `Reservation #${updated.id.slice(0, 6)} saved.`, 'success');
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={reservations.length} icon={<Calendar className="w-4 h-4" />} />
        <StatCard
          title="Active"
          value={reservations.filter((entry) => entry.status === 'active').length}
          icon={<Clock className="w-4 h-4" />}
          color="text-blue-500"
        />
        <StatCard
          title="Pending"
          value={reservations.filter((entry) => entry.status === 'pending').length}
          icon={<AlertCircle className="w-4 h-4" />}
          color="text-orange-500"
        />
        <StatCard
          title="Completed"
          value={reservations.filter((entry) => entry.status === 'completed').length}
          icon={<Check className="w-4 h-4" />}
          color="text-green-500"
        />
      </div>

      <div className="bg-surface/50 rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table aria-label="Reservations" className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              {isStaff && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={isStaff ? 7 : 6} className="px-4 py-8 text-center text-text-muted">
                  No reservations found.
                </td>
              </tr>
            ) : (
              reservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-border/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">#{reservation.id.slice(0, 6)}</td>
                  <td className="px-4 py-3 font-medium">{reservation.customerName || reservation.customerId}</td>
                  <td className="px-4 py-3 text-text-muted">{reservation.vehicleName || reservation.vehicleId}</td>
                  <td className="px-4 py-3 text-xs">
                    {reservation.pickupDate} - {reservation.dropoffDate}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        STATUS_STYLES[reservation.status] ?? 'bg-green-500/10 text-green-500',
                      )}
                    >
                      {reservation.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold">${reservation.totalPrice}</td>
                  {isStaff && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditing(reservation)}
                        aria-label={`Edit reservation ${reservation.id.slice(0, 6)}`}
                        className="p-1.5 rounded-lg hover:bg-border text-text-muted hover:text-orange-500 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ReservationEditModal
          reservation={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
