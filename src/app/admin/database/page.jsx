'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Download, Search, SlidersHorizontal } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { StatusBadge } from '@/components/UI';
import { fetchAdminPharmacies } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function MasterDatabasePage() {
  const params = useSearchParams();
  const searchParam = params.get('search') || '';
  const medicineParam = params.get('medicine') || '';

  const [q, setQ] = useState(searchParam);
  useEffect(() => { setQ(searchParam); }, [searchParam]);

  const { data, loading, error } = useApi(
    () => fetchAdminPharmacies({ medicine: medicineParam }),
    [medicineParam]
  );
  const pharmacies = data ?? [];

  const rows = useMemo(
    () => pharmacies.filter((p) => `${p.name} ${p.owner} ${p.city} ${p.license}`.toLowerCase().includes(q.toLowerCase())),
    [pharmacies, q]
  );

  function exportCsv() {
    const header = ['Katara ID', 'Pharmacy', 'Owner', 'License', 'City', 'Address', 'Phone', 'Email', 'Plan', 'Units on hand', 'Status', 'Joined'];
    const body = rows.map((p) => [p.code, p.name, p.owner, p.license, p.city, p.address, p.phone, p.email, p.plan, p.medicineRecords, p.status, formatDate(p.joined)]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'katara-pharmacies.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return <PortalShell
    role="admin"
    eyebrow="MASTER PHARMACY DATA"
    title="Subscribed pharmacy database"
    actions={<button className="secondary-button" onClick={exportCsv}><Download size={16} />Export records</button>}
  >
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}

    <div className="master-db-banner">
      <div><span><Building2 size={19} /></span><p><strong>{medicineParam ? `Pharmacies stocking ${medicineParam}` : 'Authoritative network view'}</strong><small>Served by an admin-only endpoint. The browser never touches SQL directly.</small></p></div>
      <b>{pharmacies.length} pharmacies</b>
    </div>

    <section className="table-card">
      <div className="table-toolbar">
        <div className="table-search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pharmacy, owner, license or area" /></div>
        <button className="secondary-button"><SlidersHorizontal size={16} />Filters</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Katara ID</th><th>Pharmacy</th><th>Owner / license</th><th>Location</th><th>Plan</th><th>Units on hand</th><th>Joined</th><th>Status</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="empty-note">Loading master records…</td></tr>}
            {!loading && !rows.length && <tr><td colSpan={8} className="empty-note">No pharmacy matches that search.</td></tr>}
            {rows.map((p) => <tr key={p.id}>
              <td className="mono">{p.code}</td>
              <td><strong>{p.name}</strong><small className="block-muted">{p.address}</small></td>
              <td><strong>{p.owner}</strong><small className="block-muted">{p.license}</small></td>
              <td>{p.city}</td>
              <td>{p.plan}</td>
              <td>{p.medicineRecords.toLocaleString()}</td>
              <td>{formatDate(p.joined)}</td>
              <td><StatusBadge status={p.status} /></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <div className="backend-callout"><span>MASTER DATA RULE</span><p>Pharmacy users can only CRUD their own inventory — the server derives their pharmacy from the staff table, not from the request. This cross-pharmacy view is a separate admin-only endpoint.</p></div>
  </PortalShell>;
}

export default function MasterDatabasePageRoute() {
  return <Suspense fallback={<div className="page-loader"><div className="loader-ring" /></div>}><MasterDatabasePage /></Suspense>;
}
