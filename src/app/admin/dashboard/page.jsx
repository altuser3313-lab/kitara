'use client';

import { Activity, AlertTriangle, Building2, Database, MapPinned, MessageSquareText, ShieldCheck, UsersRound } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { SectionCard, StatCard, StatusBadge } from '@/components/UI';
import { fetchAdminDashboard } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export default function AdminDashboardPage() {
  const { data, loading, error } = useApi(fetchAdminDashboard, []);
  const summary = data?.summary;
  const activity = data?.activity ?? [];
  const peak = Math.max(1, ...activity.map((a) => a.reservations));

  return <PortalShell role="admin" eyebrow="KATARA NETWORK OPERATIONS" title="Network overview">
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}

    <div className="stats-grid four">
      <StatCard icon={Building2} value={summary ? String(summary.pharmacies) : '—'} label="Subscribed pharmacies" detail={summary ? `${summary.verifiedPharmacies} verified` : ''} />
      <StatCard icon={UsersRound} value={summary ? String(summary.customers) : '—'} label="Registered customers" detail="Across the network" />
      <StatCard icon={MessageSquareText} value={summary ? String(summary.reservations) : '—'} label="Reservations" detail={summary ? `${summary.fulfilmentRate}% fulfilled` : ''} />
      <StatCard icon={Database} value={summary ? summary.inventoryUnits.toLocaleString() : '—'} label="Inventory units" detail="Live from pharmacy_inventory" />
    </div>

    <div className="admin-dashboard-grid">
      <SectionCard title="Network activity" subtitle="Reservation volume across the last seven days" className="chart-card">
        <div className="bar-chart">
          {loading && <p className="empty-note">Loading activity…</p>}
          {activity.map((a) => <div key={a.day}>
            <span style={{ height: `${Math.round((a.reservations / peak) * 100)}%` }} title={`${a.reservations} reservations`} />
            <small>{a.label}</small>
          </div>)}
        </div>
        <div className="chart-legend"><span><i />Reservations</span><strong>{activity.reduce((sum, a) => sum + a.reservations, 0)} <small>in the last 7 days</small></strong></div>
      </SectionCard>

      <SectionCard title="System health" subtitle="Key connected-service status">
        <div className="health-list">
          <div><span className="health-icon"><Activity size={17} /></span><p><strong>Katara API</strong><small>Express service on :4000</small></p><StatusBadge status={error ? 'Critical' : 'Healthy'} /></div>
          <div><span className="health-icon"><Database size={17} /></span><p><strong>PostgreSQL</strong><small>Embedded PGlite · Aurora-ready</small></p><StatusBadge status={error ? 'Critical' : 'Healthy'} /></div>
          <div><span className="health-icon"><ShieldCheck size={17} /></span><p><strong>Auth</strong><small>Local JWT · Cognito-shaped claims</small></p><StatusBadge status="Watch" /></div>
          <div><span className="health-icon"><MapPinned size={17} /></span><p><strong>Location service</strong><small>Map adapter awaiting keys</small></p><StatusBadge status="Watch" /></div>
        </div>
      </SectionCard>
    </div>

    <div className="two-column-panels">
      <SectionCard title="Recent pharmacies" subtitle="Newest records in the network" action={<a className="text-link" href="/admin/database">Open master database</a>}>
        <div className="compact-table">
          {loading && <p className="empty-note">Loading…</p>}
          {data?.recentPharmacies.map((p) => <div key={p.code}>
            <span className="table-store">+</span>
            <p><strong>{p.name}</strong><small>{p.city} · {p.code}</small></p>
            <span>{formatDate(p.joined)}</span>
            <StatusBadge status={p.status} />
          </div>)}
        </div>
      </SectionCard>

      <SectionCard title="Needs attention" subtitle="Operational items worth reviewing">
        <div className="attention-list">
          <div>
            <span className="attention-icon warning"><ShieldCheck size={17} /></span>
            <p><strong>{summary?.pendingVerifications ?? 0} pharmacy verification request{summary?.pendingVerifications === 1 ? '' : 's'}</strong><small>Awaiting admin review</small></p>
            <a href="/admin/verification">Review</a>
          </div>
          <div>
            <span className="attention-icon danger"><AlertTriangle size={17} /></span>
            <p><strong>{summary?.lowStockLines ?? 0} inventory line{summary?.lowStockLines === 1 ? '' : 's'} at or below reorder level</strong><small>Across all pharmacies</small></p>
            <button>Inspect</button>
          </div>
          <div>
            <span className="attention-icon info"><Activity size={17} /></span>
            <p><strong>Substitute ranking is rule-based</strong><small>Swap for Bedrock when the model is ready</small></p>
            <button>Open</button>
          </div>
        </div>
      </SectionCard>
    </div>
  </PortalShell>;
}
