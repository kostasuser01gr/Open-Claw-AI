import { useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ClipboardCheck, ClipboardList, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/firebase';
import type { NotificationType, Task } from '@/types/domain';
import { cn } from '@/lib/utils';
import { StatCard } from './StatCard';

interface OpsModuleProps {
  tasks: Task[];
  onNotify: (title: string, message: string, type?: NotificationType) => void;
}

export function OpsModule({ tasks, onNotify }: OpsModuleProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklist, setChecklist] = useState({
    tirePressure: 'Normal',
    fluidLevels: 'Full',
    interiorCleanliness: 'Clean',
    existingDamage: 'None',
  });

  const handlePriorityChange = async (taskId: string, newPriority: Task['priority']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { priority: newPriority });
      onNotify('Task updated', `Priority changed to ${newPriority}.`, 'success');
    } catch (error) {
      const appError = handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
      onNotify('Task update failed', appError.userMessage, 'error');
    }
  };

  const handleSubmitInspection = async () => {
    if (!selectedTask) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'inspections'), {
        taskId: selectedTask.id,
        vehicleId: selectedTask.relatedId || 'unknown',
        inspectorId: auth.currentUser?.uid || 'unknown',
        type: selectedTask.title.toLowerCase().includes('return') ? 'post-rental' : 'pre-rental',
        ...checklist,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'tasks', selectedTask.id), { status: 'completed' });
      onNotify('Inspection submitted', `Inspection completed for task ${selectedTask.title}.`, 'success');
      setSelectedTask(null);
      setChecklist({
        tirePressure: 'Normal',
        fluidLevels: 'Full',
        interiorCleanliness: 'Clean',
        existingDamage: 'None',
      });
    } catch (error) {
      const appError = handleFirestoreError(error, OperationType.WRITE, 'inspections');
      onNotify('Inspection failed', appError.userMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Tasks"
          value={tasks.filter((task) => task.status !== 'completed').length}
          icon={<ClipboardList className="w-4 h-4" />}
        />
        <StatCard
          title="Urgent"
          value={tasks.filter((task) => task.priority === 'high').length}
          icon={<AlertCircle className="w-4 h-4" />}
          color="text-red-500"
        />
        <StatCard
          title="Completed"
          value={tasks.filter((task) => task.status === 'completed').length}
          icon={<Check className="w-4 h-4" />}
          color="text-green-500"
        />
      </div>

      {selectedTask ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-surface/50 rounded-2xl border border-orange-500/30 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Vehicle Inspection Checklist</h3>
                <p className="text-xs text-text-muted">Task: {selectedTask.title}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTask(null)}
              aria-label="Close inspection checklist"
              className="p-2 hover:bg-border rounded-md text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Tire Pressure</label>
              <select
                value={checklist.tirePressure}
                aria-label="Tire pressure"
                onChange={(event) => setChecklist({ ...checklist, tirePressure: event.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
              >
                <option>Normal</option>
                <option>Low - Needs Air</option>
                <option>Critical - Needs Repair</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Fluid Levels</label>
              <select
                value={checklist.fluidLevels}
                aria-label="Fluid levels"
                onChange={(event) => setChecklist({ ...checklist, fluidLevels: event.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
              >
                <option>Full</option>
                <option>Low - Needs Top-up</option>
                <option>Empty - Needs Refill</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Interior Cleanliness</label>
              <select
                value={checklist.interiorCleanliness}
                aria-label="Interior cleanliness"
                onChange={(event) => setChecklist({ ...checklist, interiorCleanliness: event.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
              >
                <option>Clean</option>
                <option>Minor Cleaning Needed</option>
                <option>Deep Clean Required</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Existing Damage</label>
              <textarea
                value={checklist.existingDamage}
                aria-label="Existing damage"
                onChange={(event) => setChecklist({ ...checklist, existingDamage: event.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50 min-h-[80px]"
              />
            </div>
          </div>
          <button
            onClick={() => void handleSubmitInspection()}
            disabled={isSubmitting}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit Inspection & Complete Task
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-text-muted bg-surface/50 rounded-xl border border-border">
              No operational tasks assigned.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => task.status !== 'completed' && setSelectedTask(task)}
                className={cn(
                  'p-4 bg-surface/50 rounded-xl border border-border flex items-center justify-between hover:bg-border/50 transition-all cursor-pointer',
                  task.status === 'completed' && 'opacity-60 cursor-default',
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      task.priority === 'high'
                        ? 'bg-red-500/10 text-red-500'
                        : task.priority === 'medium'
                          ? 'bg-orange-500/10 text-orange-500'
                          : 'bg-blue-500/10 text-blue-500',
                    )}
                  >
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{task.title}</h3>
                    <p className="text-xs text-text-muted">{task.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-text-muted">Priority</p>
                    <select
                      value={task.priority}
                      aria-label={`Task priority for ${task.title}`}
                      onChange={(event) => void handlePriorityChange(task.id, event.target.value as Task['priority'])}
                      onClick={(event) => event.stopPropagation()}
                      disabled={task.status === 'completed'}
                      className={cn(
                        'bg-transparent text-xs font-bold focus:outline-none cursor-pointer appearance-none text-right',
                        task.priority === 'high'
                          ? 'text-red-500'
                          : task.priority === 'medium'
                            ? 'text-orange-500'
                            : 'text-blue-500',
                      )}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-text-muted">Due Date</p>
                    <p className="text-xs">{task.dueDate || 'TBD'}</p>
                  </div>
                  <div className={cn('w-2 h-2 rounded-full', task.status === 'completed' ? 'bg-green-500' : 'bg-orange-500')} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
