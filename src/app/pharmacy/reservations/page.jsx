'use client';

import { useMemo, useState } from 'react';
import { Check, Clock3, FileText, MessageSquareText, Phone, Search, X } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { Modal, SectionCard, StatusBadge } from '@/components/UI';
import { fetchCustomerHistory, fetchPharmacyReservations, setReservationStatus } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

const TABS = [
  { id: 'pending', label: 'Pending', statuses: ['pending'] },
  { id: 'accepted', label: 'Accepted', statuses: ['accepted', 'ready'] },
  { id: 'completed', label: 'Completed', statuses: ['collected'] },
  { id: 'declined', label: 'Declined', statuses: ['declined', 'cancelled', 'expired'] }
];

function relativeTime(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export default function ReservationsPage() {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState('');
  const [history, setHistory] = useState(null);

  const { data, loading, error, reload } = useApi(fetchPharmacyReservations, []);
  const items = data?.reservations ?? [];

  const counts = useMemo(() => Object.fromEntries(
    TABS.map((t) => [t.id, items.filter((r) => t.statuses.includes(r.status)).length])
  ), [items]);

  const visible = useMemo(() => {
    const statuses = TABS.find((t) => t.id === tab).statuses;
    return items
      .filter((r) => statuses.includes(r.status))
      .filter((r) => r.customer.toLowerCase().includes(search.toLowerCase()));
  }, [items, tab, search]);

  async function decide(reference, status) {
    setPendingAction(`${reference}:${status}`);
    setActionError('');
    try {
      await setReservationStatus(reference, status);
      await reload();
    } catch (err) {
      setActionError(`${reference}: ${apiErrorMessage(err)}`);
    } finally {
      setPendingAction(null);
    }
  }

  async function openHistory(reference) {
    setHistory({ reference, rows: null });
    try {
      setHistory({ reference, rows: await fetchCustomerHistory(reference) });
    } catch (err) {
      setHistory({ reference, rows: [], error: apiErrorMessage(err) });
    }
  }

  return <PortalShell role="pharmacy" eyebrow="CUSTOMER REACHOUT · REAL-TIME REQUESTS" title="Reservations & customer requests">
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}
    {actionError && <div className="form-error api-banner">{actionError}</div>}

    <div className="reservation-dashboard">
      <div className="reservation-main">
        <div className="filter-tabs">
          {TABS.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label} {counts[t.id] > 0 && <span>{counts[t.id]}</span>}
          </button>)}
          <div className="inline-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer" /></div>
        </div>

        <div className="request-list">
          {loading && <p className="empty-note">Loading requests…</p>}
          {!loading && !visible.length && <p className="empty-note">Nothing in this queue.</p>}
          {visible.map((r) => <article key={r.id} className="request-card">
            <div className="request-id"><span>{r.id}</span><StatusBadge status={r.status} /></div>
            <div className="request-person">
              <span className="avatar small">{r.customer.split(' ').map((n) => n[0]).join('')}</span>
              <div><strong>{r.customer}</strong><small><Clock3 size={12} />{relativeTime(r.createdAt)}</small></div>
            </div>
            <div className="request-med"><small>REQUESTING</small><strong>{r.medicine}</strong><span>Quantity {r.quantity}</span></div>
            <div className="request-meta">
              {r.prescription ? <span className="rx-attached"><FileText size={14} />Prescription attached</span> : <span>No prescription attached</span>}
              <span><Phone size={13} />{r.phone}</span>
            </div>
            {r.status === 'pending'
              ? <div className="request-actions">
                  <button className="decline-button" disabled={pendingAction} onClick={() => decide(r.id, 'declined')}><X size={16} />Decline</button>
                  <button className="accept-button" disabled={pendingAction} onClick={() => decide(r.id, 'accepted')}><Check size={16} />{pendingAction === `${r.id}:accepted` ? 'Reserving…' : 'Accept & reserve'}</button>
                </div>
              : <div className="request-actions">
                  {r.status === 'accepted' && <button className="accept-button" disabled={pendingAction} onClick={() => decide(r.id, 'collected')}><Check size={16} />Mark collected</button>}
                  <button className="secondary-button compact" onClick={() => openHistory(r.id)}><MessageSquareText size={15} />Open customer history</button>
                </div>}
          </article>)}
        </div>
      </div>

      <aside className="reservation-side">
        <SectionCard title="This pharmacy" subtitle="Customer request activity">
          <div className="today-stats">
            <div><strong>{data?.summary.received ?? '—'}</strong><span>Requests received</span></div>
            <div><strong>{data?.summary.accepted ?? '—'}</strong><span>Accepted</span></div>
            <div><strong>{data?.summary.avgResponse ?? '—'}</strong><span>Avg. response time</span></div>
            <div><strong>{data ? `${data.summary.fulfilmentRate}%` : '—'}</strong><span>Fulfillment rate</span></div>
          </div>
        </SectionCard>
        <div className="response-note">
          <span className="mini-pulse" />
          <strong>Stock is held on accept</strong>
          <p>Accepting a request decrements the matching inventory line and writes a <code>reserve</code> row to inventory_movements, so the forecast and the customer map see the same number.</p>
        </div>
      </aside>
    </div>

    <Modal open={Boolean(history)} onClose={() => setHistory(null)} title={`Customer history · ${history?.reference ?? ''}`} subtitle="Scoped to this pharmacy's own dealings with the customer.">
      {!history?.rows && <p className="empty-note">Loading…</p>}
      {history?.error && <div className="form-error">{history.error}</div>}
      {history?.rows?.length === 0 && !history.error && <p className="empty-note">No previous requests.</p>}
      {history?.rows?.length > 0 && <div className="document-list">
        {history.rows.map((row) => <div key={row.id}>
          <span className="doc-icon"><FileText size={19} /></span>
          <div><strong>{row.medicine}</strong><small>{row.id} · quantity {row.quantity} · {relativeTime(row.createdAt)}</small></div>
          <StatusBadge status={row.status} />
        </div>)}
      </div>}
    </Modal>
  </PortalShell>;
}
