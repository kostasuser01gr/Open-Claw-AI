import { useMemo, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { executeDynamicAction, submitDynamicForm } from '@/services/dynamicActions';

type DynamicField = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
};

type DynamicTableRow = Array<string | number | boolean | null>;

type DynamicChartRow = Record<string, string | number>;

export interface DynamicUIData {
  type: 'button' | 'form' | 'card' | 'table' | 'chart';
  action?: string;
  message?: string;
  collection?: string;
  payload?: Record<string, unknown>;
  label?: string;
  title?: string;
  submitLabel?: string;
  fields?: DynamicField[];
  color?: 'orange' | 'green' | 'blue' | 'purple' | 'red' | 'yellow';
  content?: string;
  columns?: string[];
  rows?: DynamicTableRow[];
  chartType?: 'bar' | 'pie';
  data?: DynamicChartRow[];
}

const CARD_STYLES: Record<NonNullable<DynamicUIData['color']>, string> = {
  orange: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
  green: 'bg-green-500/10 border-green-500/30 text-green-500',
  blue: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  purple: 'bg-purple-500/10 border-purple-500/30 text-purple-500',
  red: 'bg-red-500/10 border-red-500/30 text-red-500',
  yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
};

const DEFAULT_CARD_STYLE = 'bg-surface border-border text-text';
const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export function DynamicUI({
  data,
  onSendMessage,
}: {
  data: DynamicUIData;
  onSendMessage: (msg: string) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>(() =>
    Object.fromEntries((data.fields || []).map((field) => [field.name, field.defaultValue || ''])),
  );

  const cardClassName = useMemo(() => {
    return data.color ? CARD_STYLES[data.color] : DEFAULT_CARD_STYLE;
  }, [data.color]);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!data.collection) {
      setErrorMessage('Missing safe collection target for this form.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await submitDynamicForm(data.collection, formData);
      setIsSuccess(true);
      onSendMessage(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Form submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async () => {
    if (!data.action) {
      setErrorMessage('Unsupported action.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await executeDynamicAction(data.action, data.message);
      setIsSuccess(true);
      onSendMessage(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (data.type === 'button') {
    return (
      <div className="mt-2 space-y-2">
        <button
          onClick={() => void handleAction()}
          disabled={isSubmitting || isSuccess}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {isSuccess ? 'Done' : data.label || 'Run action'}
        </button>
        {errorMessage && (
          <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  if (data.type === 'form') {
    if (isSuccess) {
      return (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 text-green-500">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Successfully submitted!</span>
        </div>
      );
    }

    return (
      <form onSubmit={handleFormSubmit} className="mt-4 p-5 bg-surface border border-border rounded-xl space-y-4 max-w-md">
        <h3 className="text-sm font-bold text-text">{data.title}</h3>

        <div className="space-y-3">
          {data.fields?.map((field) => {
            const fieldId = `dynamic-field-${field.name}`;
            return (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label htmlFor={fieldId} className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {field.label}
                </label>
                <input
                  id={fieldId}
                  type={field.type || 'text'}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData((current) => ({ ...current, [field.name]: e.target.value }))}
                  className="bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-text"
                />
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : data.submitLabel || 'Submit'}
        </button>
      </form>
    );
  }

  if (data.type === 'card') {
    return (
      <div className={`mt-2 p-4 rounded-xl border ${cardClassName}`}>
        <h4 className="text-sm font-bold mb-1">{data.title}</h4>
        <p className="text-xs opacity-80">{data.content}</p>
      </div>
    );
  }

  if (data.type === 'table') {
    return (
      <div className="mt-4 bg-surface border border-border rounded-xl overflow-hidden">
        {data.title && <div className="p-4 border-b border-border font-bold text-sm">{data.title}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg text-text-muted uppercase tracking-wider">
              <tr>
                {data.columns?.map((column) => (
                  <th key={column} className="px-4 py-3 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows?.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join('-')}`} className="hover:bg-bg/50 transition-colors">
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3">
                      {cell === null ? '—' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.type === 'chart') {
    return (
      <div className="mt-4 p-4 bg-surface border border-border rounded-xl">
        {data.title && <div className="font-bold text-sm mb-4">{data.title}</div>}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {data.chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={data.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.data?.map((entry, index) => (
                    <Cell key={`${String(entry.name || index)}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text)' }}
                />
              </PieChart>
            ) : (
              <BarChart data={data.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text)' }}
                  cursor={{ fill: 'var(--border)', opacity: 0.4 }}
                />
                <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs">
      Unsupported UI type: {data.type}
    </div>
  );
}
