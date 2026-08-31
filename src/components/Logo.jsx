import { Cross } from 'lucide-react';

export default function Logo({ compact = false }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark"><Cross size={18} strokeWidth={2.4} /></span>
      {!compact && <span className="brand-word">katara</span>}
    </div>
  );
}
