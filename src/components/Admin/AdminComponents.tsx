import { ReactNode } from 'react';
import { X, Save } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col sm:mx-4">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-500 hover:text-slate-700 active:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

interface InputProps {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
}

export function Input({ label, name, type = 'text', defaultValue, required, placeholder }: InputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
      />
    </div>
  );
}

interface TextareaProps {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

export function Textarea({ label, name, defaultValue, placeholder, rows = 3, required }: TextareaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none"
      />
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  name: string;
  defaultValue?: string | number;
  options: SelectOption[];
}

export function Select({ label, name, defaultValue, options }: SelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

interface CheckboxProps {
  label: string;
  name: string;
  defaultChecked?: boolean;
}

export function Checkbox({ label, name, defaultChecked }: CheckboxProps) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

interface FormButtonsProps {
  onCancel: () => void;
  color?: 'blue' | 'green' | 'red' | 'orange';
  label?: string;
}

export function FormButtons({ onCancel, color = 'blue', label = 'Save' }: FormButtonsProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    green: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    red: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    orange: 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800'
  };

  return (
    <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
      <button
        type="submit"
        className={`flex-1 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${colorClasses[color]}`}
      >
        <Save className="w-4 h-4" />
        {label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 active:bg-slate-300"
      >
        Cancel
      </button>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: 'blue' | 'green' | 'orange' | 'red';
}

export function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50'
  };
  const iconColors: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600'
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
        <Icon className={`w-5 h-5 ${iconColors[color]}`} />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: 'blue' | 'green' | 'orange' | 'red';
  onClick: () => void;
}

export function QuickAction({ icon: Icon, label, color, onClick }: QuickActionProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 active:bg-blue-100',
    green: 'bg-green-50 text-green-700 active:bg-green-100',
    orange: 'bg-orange-50 text-orange-700 active:bg-orange-100',
    red: 'bg-red-50 text-red-700 active:bg-red-100'
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-3.5 rounded-xl font-medium text-sm ${colorClasses[color]}`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClasses: Record<string, string> = {
    operational: 'bg-green-100 text-green-700',
    full: 'bg-red-100 text-red-700',
    closed: 'bg-slate-100 text-slate-600',
    emergency: 'bg-amber-100 text-amber-700'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colorClasses[status] || colorClasses.closed}`}>
      {status}
    </span>
  );
}
