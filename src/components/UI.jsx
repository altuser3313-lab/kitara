'use client';

import { ArrowDownRight, ArrowUpRight, Check, X } from 'lucide-react';

export function StatCard({ label, value, detail, trend, icon: Icon }) {
  const positive = trend?.startsWith('+');
  return <div className="stat-card"><div className="stat-top"><span className="stat-icon">{Icon && <Icon size={19} />}</span>{trend && <span className={`trend ${positive ? 'up' : 'down'}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend}</span>}</div><strong className="stat-value">{value}</strong><span className="stat-label">{label}</span>{detail && <small className="stat-detail">{detail}</small>}</div>;
}

export function Badge({ children, tone = 'neutral' }) { return <span className={`badge ${tone}`}>{children}</span>; }

const STATUS_TONES = {
  success: ['active', 'healthy', 'accepted', 'collected', 'open', 'ready', 'verified', 'approved', 'valid'],
  warning: ['pending', 'watch', 'verification', 'review'],
  info: ['low', 'received'],
  danger: ['critical', 'declined', 'expired', 'rejected', 'out', 'cancelled']
};

export function StatusBadge({ status }) {
  const key = String(status ?? '').toLowerCase();
  const tone = Object.keys(STATUS_TONES).find((t) => STATUS_TONES[t].includes(key)) || 'neutral';
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : '—';
  return <Badge tone={tone}><span className="badge-dot" />{label}</Badge>;
}

export function SectionCard({ title, subtitle, action, children, className = '' }) {
  return <section className={`section-card ${className}`}><div className="section-card-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

export function Progress({ value }) { return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }

export function Modal({ open, title, subtitle, onClose, children }) {
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div>;
}

export function SuccessState({ title, text, onDone }) { return <div className="success-state"><span className="success-icon"><Check size={27} /></span><h3>{title}</h3><p>{text}</p>{onDone && <button className="primary-button" onClick={onDone}>Done</button>}</div>; }
