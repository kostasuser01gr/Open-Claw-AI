import { useState } from 'react';
import { AlertCircle, Car, Check, Image as ImageIcon, Loader2, TrendingUp, Wrench, X, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { FleetFilters } from '@/components/FleetFilters';
import { db, getDownloadURL, handleFirestoreError, OperationType, ref, storage, uploadBytes } from '@/firebase';
import type {
  DamageReport,
  FleetFilterOptions,
  MaintenanceRecord,
  NotificationType,
  Vehicle,
} from '@/types/domain';
import { cn } from '@/lib/utils';
import { StatCard } from './StatCard';

interface FleetModuleProps {
  vehicles: Vehicle[];
  maintenance: MaintenanceRecord[];
  damageReports: DamageReport[];
  filters: FleetFilterOptions;
  setFilters: (filters: FleetFilterOptions) => void;
  onNotify: (title: string, message: string, type?: NotificationType) => void;
}

export function FleetModule({
  vehicles,
  maintenance,
  damageReports,
  filters,
  setFilters,
  onNotify,
}: FleetModuleProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (filters.carType !== 'all' && vehicle.type.toLowerCase() !== filters.carType.toLowerCase()) {
      return false;
    }
    if (filters.transmission !== 'all' && vehicle.transmission.toLowerCase() !== filters.transmission.toLowerCase()) {
      return false;
    }
    if (vehicle.dailyRate > filters.maxPrice) {
      return false;
    }
    if (filters.availability !== 'all' && vehicle.status !== filters.availability) {
      return false;
    }
    return true;
  });

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null;
  const vehicleMaintenance = maintenance.filter((entry) => entry.vehicleId === selectedVehicleId);
  const vehicleDamage = damageReports.filter((entry) => entry.vehicleId === selectedVehicleId);

  const handleImageUpload = async (vehicleId: string, file: File) => {
    setUploadingId(vehicleId);
    try {
      const storageRef = ref(storage, `vehicles/${vehicleId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      const vehicle = vehicles.find((entry) => entry.id === vehicleId);
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        photoUrls: [...(vehicle?.photoUrls || []), downloadUrl],
      });
      onNotify('Vehicle image uploaded', `Photo added to vehicle ${vehicle?.name || vehicleId}.`, 'success');
    } catch (error) {
      const appError = handleFirestoreError(error, OperationType.UPDATE, `vehicles/${vehicleId}`);
      onNotify('Vehicle update failed', appError.userMessage, 'error');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-surface/50 rounded-xl border border-border flex flex-wrap gap-4 items-end">
        <FleetFilters filters={filters} setFilters={setFilters} />
        <button
          onClick={() =>
            setFilters({
              carType: 'all',
              transmission: 'all',
              maxPrice: 200,
              availability: 'all',
            })
          }
          aria-label="Reset vehicle filters"
          className="p-2 hover:bg-border rounded-lg text-text-muted hover:text-orange-500 transition-colors"
          title="Reset Filters"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Fleet" value={vehicles.length} icon={<Car className="w-4 h-4" />} />
        <StatCard
          title="Available"
          value={vehicles.filter((vehicle) => vehicle.status === 'available').length}
          icon={<Check className="w-4 h-4" />}
          color="text-green-500"
        />
        <StatCard
          title="Maintenance"
          value={vehicles.filter((vehicle) => vehicle.status === 'maintenance').length}
          icon={<Wrench className="w-4 h-4" />}
          color="text-orange-500"
        />
      </div>

      <div className="bg-surface/50 rounded-xl border border-border">
        <div className="px-4 py-3 border-b border-border bg-border/20 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Vehicle List <span className="text-orange-500 ml-2">(Filtered: {filteredVehicles.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table aria-label="Fleet vehicles" className="min-w-[920px] w-full text-left text-sm">
          <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Transmission</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Price/Day</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  No vehicles matching filters found.
                </td>
              </tr>
            ) : (
              filteredVehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="hover:bg-border/20 transition-colors cursor-pointer group"
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      {vehicle.photoUrls[0] ? (
                        <img
                          src={vehicle.photoUrls[0]}
                          alt={vehicle.name}
                          className="w-10 h-10 rounded-lg object-cover border border-border"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-border flex items-center justify-center">
                          <Car className="w-5 h-5 text-text-muted" />
                        </div>
                      )}
                      <span>{vehicle.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted capitalize">{vehicle.type}</td>
                  <td className="px-4 py-3 text-text-muted capitalize">{vehicle.transmission}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        vehicle.status === 'available'
                          ? 'bg-green-500/10 text-green-500'
                          : vehicle.status === 'available soon'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-orange-500/10 text-orange-500',
                      )}
                    >
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{vehicle.branchId || 'Main Branch'}</td>
                  <td className="px-4 py-3 font-bold">${vehicle.dailyRate}</td>
                  <td className="px-4 py-3 text-right">
                    <label
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Upload photo for ${vehicle.name}`}
                      title={`Upload photo for ${vehicle.name}`}
                      className={cn(
                        'inline-flex p-1.5 hover:bg-border rounded-lg text-text-muted hover:text-text transition-colors cursor-pointer',
                        uploadingId === vehicle.id && 'animate-pulse pointer-events-none',
                      )}
                    >
                      {uploadingId === vehicle.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      <input
                        type="file"
                        className="hidden"
                        aria-label={`Upload photo for ${vehicle.name}`}
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void handleImageUpload(vehicle.id, file);
                          }
                        }}
                      />
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-border/10">
                <div>
                  <h3 className="text-lg font-bold">
                    {selectedVehicle.make} {selectedVehicle.model}
                  </h3>
                  <p className="text-xs text-text-muted uppercase tracking-widest font-bold">
                    {selectedVehicle.plate || 'No plate'} • {selectedVehicle.year || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVehicleId(null)}
                  aria-label="Close vehicle details"
                  className="p-2 hover:bg-border rounded-full text-text-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="aspect-video rounded-2xl bg-border overflow-hidden relative group">
                      {selectedVehicle.photoUrls[0] ? (
                        <img
                          src={selectedVehicle.photoUrls[0]}
                          alt={selectedVehicle.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          <Car className="w-12 h-12 opacity-20" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <StatCard
                        title="Daily Rate"
                        value={`$${selectedVehicle.dailyRate}`}
                        icon={<TrendingUp className="w-4 h-4" />}
                      />
                      <StatCard title="Status" value={selectedVehicle.status} icon={<Car className="w-4 h-4" />} color="text-blue-500" />
                      <StatCard title="Type" value={selectedVehicle.type} icon={<Car className="w-4 h-4" />} color="text-purple-500" />
                      <StatCard
                        title="Transmission"
                        value={selectedVehicle.transmission}
                        icon={<Zap className="w-4 h-4" />}
                        color="text-green-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                          <Wrench className="w-3 h-3" /> Maintenance History
                        </h4>
                        <span className="text-[10px] font-bold bg-border px-2 py-0.5 rounded-full">
                          {vehicleMaintenance.length} Records
                        </span>
                      </div>
                      <div className="space-y-3">
                        {vehicleMaintenance.length === 0 ? (
                          <p className="text-xs text-text-muted italic p-4 border border-dashed border-border rounded-xl text-center">
                            No maintenance records found.
                          </p>
                        ) : (
                          vehicleMaintenance.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-3 rounded-xl bg-border/10 border border-border flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium capitalize">{entry.type}</p>
                                <p className="text-[10px] text-text-muted">{new Date(entry.date).toLocaleDateString()}</p>
                              </div>
                              <p className="text-sm font-bold text-text-muted">${entry.cost}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" /> Damage Reports
                        </h4>
                        <span className="text-[10px] font-bold bg-border px-2 py-0.5 rounded-full">
                          {vehicleDamage.length} Reports
                        </span>
                      </div>
                      <div className="space-y-3">
                        {vehicleDamage.length === 0 ? (
                          <p className="text-xs text-text-muted italic p-4 border border-dashed border-border rounded-xl text-center">
                            No damage reports found.
                          </p>
                        ) : (
                          vehicleDamage.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium capitalize">{entry.severity} Severity</p>
                                <p className="text-[10px] text-text-muted">
                                  {new Date(entry.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                                  entry.severity === 'high' || entry.severity === 'critical'
                                    ? 'bg-red-500/20 text-red-500'
                                    : 'bg-orange-500/20 text-orange-500',
                                )}
                              >
                                {entry.severity}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
