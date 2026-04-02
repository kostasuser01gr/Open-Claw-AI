import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reservation } from '@/types/domain';

interface ReservationEditModalProps {
  reservation: Reservation;
  onSave: (updated: Reservation) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: Reservation['status'][] = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];

export function ReservationEditModal({ reservation, onSave, onClose }: Readonly<ReservationEditModalProps>) {
  const [form, setForm] = useState({ ...reservation });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal"
        className="absolute inset-0 bg-black/60 cursor-default"
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit Reservation</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-border rounded-lg text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Pickup Date</span>
            <input
              type="date"
              value={form.pickupDate}
              onChange={(e) => setForm((prev) => ({ ...prev, pickupDate: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Dropoff Date</span>
            <input
              type="date"
              value={form.dropoffDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dropoffDate: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Reservation['status'] }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Total Price</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.totalPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, totalPrice: Number(e.target.value) }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Notes</span>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-orange-500 resize-none"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all',
              'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20',
            )}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
