import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Send, CheckCircle2 } from 'lucide-react';

export interface DynamicUIData {
  type: 'button' | 'form' | 'card';
  action?: string;
  message?: string;
  collection?: string;
  payload?: Record<string, unknown>;
  label?: string;
  title?: string;
  submitLabel?: string;
  fields?: Array<{
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
  }>;
  color?: string;
  content?: string;
}

export function DynamicUI({ data, onSendMessage }: { data: DynamicUIData, onSendMessage: (msg: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (data.collection) {
        await addDoc(collection(db, data.collection), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        setIsSuccess(true);
        onSendMessage(`Successfully submitted form to ${data.collection} with data: ${JSON.stringify(formData)}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, data.collection);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async () => {
    setIsSubmitting(true);
    try {
      if (data.action === 'send_message') {
        onSendMessage(data.message);
      } else if (data.action === 'create_doc' && data.collection) {
        await addDoc(collection(db, data.collection), {
          ...data.payload,
          createdAt: new Date().toISOString()
        });
        setIsSuccess(true);
        onSendMessage(`Successfully created document in ${data.collection}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, data.collection);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (data.type === 'button') {
    return (
      <button 
        onClick={handleAction}
        disabled={isSubmitting || isSuccess}
        className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
        {isSuccess ? 'Done' : data.label}
      </button>
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
          {data.fields?.map((field, i: number) => (
            <div key={i} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{field.label}</label>
              <input 
                type={field.type || 'text'}
                required={field.required}
                defaultValue={field.defaultValue}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-text"
              />
            </div>
          ))}
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : (data.submitLabel || 'Submit')}
        </button>
      </form>
    );
  }

  if (data.type === 'card') {
    return (
      <div className={`mt-2 p-4 rounded-xl border ${data.color ? `bg-${data.color}-500/10 border-${data.color}-500/30 text-${data.color}-500` : 'bg-surface border-border text-text'}`}>
        <h4 className="text-sm font-bold mb-1">{data.title}</h4>
        <p className="text-xs opacity-80">{data.content}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs">
      Unsupported UI type: {data.type}
    </div>
  );
}
