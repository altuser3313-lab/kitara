'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Boxes, Download, PackageCheck, Plus, Search, SlidersHorizontal } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { Modal, StatCard, StatusBadge } from '@/components/UI';
import { addInventoryItem, fetchInventory, fetchMedications, formatLbp, updateInventoryItem } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';
import { useAuth } from '@/lib/auth-context';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function InventoryPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const queryParam = params.get('q') || '';

  const [query, setQuery] = useState(queryParam);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { setQuery(queryParam); }, [queryParam]);

  const { data, loading, error, reload } = useApi(fetchInventory, []);
  const { data: catalog } = useApi(fetchMedications, []);

  const items = data?.items ?? [];
  const summary = data?.summary;

  const filtered = useMemo(
    () => items.filter((m) => `${m.name} ${m.genericName} ${m.sku}`.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  async function saveStock(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const form = new FormData(e.target);
      await updateInventoryItem(editing.id, {
        stock: Number(form.get('stock')),
        reorderAt: Number(form.get('reorderAt')),
        retailPrice: Number(form.get('retailPrice')),
        supplier: form.get('supplier')
      });
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function addMedicine(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const form = new FormData(e.target);
      await addInventoryItem({
        medicationId: Number(form.get('medicationId')),
        stock: Number(form.get('stock')),
        reorderAt: Number(form.get('reorderAt')),
        batch: form.get('batch') || null,
        supplier: form.get('supplier') || null,
        retailPrice: form.get('retailPrice') ? Number(form.get('retailPrice')) : null,
        expiry: form.get('expiry') || null
      });
      setAdding(false);
      reload();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ['Medication', 'SKU', 'Batch', 'Stock', 'Reorder at', 'Expiry', 'Supplier', 'Retail (LBP)', 'Status'];
    const rows = filtered.map((m) => [m.name, m.sku, m.batch, m.stock, m.reorderAt, m.expiry ?? '', m.supplier ?? '', m.retailPrice ?? '', m.status]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'katara-inventory.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return <PortalShell
    role="pharmacy"
    eyebrow={`${(user?.pharmacyName || 'PHARMACY').toUpperCase()} · LIVE INVENTORY`}
    title="Medication inventory"
    actions={<>
      <button className="secondary-button" onClick={exportCsv}><Download size={16} />Export</button>
      <button className="primary-button" onClick={() => { setAdding(true); setFormError(''); }}><Plus size={16} />Add medicine</button>
    </>}
  >
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}

    <div className="stats-grid four">
      <StatCard icon={Boxes} value={summary ? summary.records.toLocaleString() : '—'} label="Units on hand" detail={summary ? `Across ${summary.categories} categories` : ''} />
      <StatCard icon={PackageCheck} value={summary ? `${summary.inStockRate}%` : '—'} label="In-stock rate" detail={summary ? `${summary.inStockLines} of ${summary.lines} lines available` : ''} />
      <StatCard icon={AlertTriangle} value={summary ? String(summary.lowStock) : '—'} label="Low-stock lines" detail="At or below reorder level" />
      <StatCard icon={Boxes} value={summary ? formatLbp(summary.inventoryValue) : '—'} label="Inventory value" detail="Estimated at cost" />
    </div>

    <section className="table-card">
      <div className="table-toolbar">
        <div className="table-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search medication, generic name or SKU" /></div>
        <button className="secondary-button"><SlidersHorizontal size={16} />Filters</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Medication</th><th>SKU / Batch</th><th>Stock</th><th>Reorder at</th><th>Expiry</th><th>Supplier</th><th>Retail</th><th>Status</th><th /></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="empty-note">Loading inventory…</td></tr>}
            {!loading && !filtered.length && <tr><td colSpan={9} className="empty-note">No medication matches that search.</td></tr>}
            {filtered.map((m) => <tr key={m.id}>
              <td><div className="table-primary"><span className="table-med-icon">Rx</span><div><strong>{m.name}</strong><small>{m.detail}</small></div></div></td>
              <td><strong className="mono">{m.sku}</strong><small className="block-muted">{m.batch}</small></td>
              <td><strong>{m.stock}</strong> units</td>
              <td>{m.reorderAt}</td>
              <td>{formatDate(m.expiry)}</td>
              <td>{m.supplier}</td>
              <td>{formatLbp(m.retailPrice)}</td>
              <td><StatusBadge status={m.status} /></td>
              <td><button className="small-button" onClick={() => { setEditing(m); setFormError(''); }}>Adjust</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {filtered.length} of {items.length} records</span></div>
    </section>

    <div className="backend-callout"><span>SQL LIVE</span><p><strong>These rows are the pharmacy_inventory table.</strong> Every read and write is scoped to this pharmacy by the staff relationship on the server, so a pharmacy user cannot reach another pharmacy&apos;s stock.</p></div>

    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={`Adjust ${editing?.name ?? ''}`} subtitle="Stock changes are recorded in inventory_movements.">
      <form className="modal-form" onSubmit={saveStock}>
        <div className="form-two">
          <label>Stock on hand<input name="stock" type="number" min="0" defaultValue={editing?.stock} required /></label>
          <label>Reorder at<input name="reorderAt" type="number" min="0" defaultValue={editing?.reorderAt} required /></label>
        </div>
        <div className="form-two">
          <label>Retail price (LBP)<input name="retailPrice" type="number" min="0" step="1000" defaultValue={editing?.retailPrice ?? ''} /></label>
          <label>Supplier<input name="supplier" defaultValue={editing?.supplier ?? ''} /></label>
        </div>
        {formError && <div className="form-error">{formError}</div>}
        <button className="primary-button wide" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </Modal>

    <Modal open={adding} onClose={() => setAdding(false)} title="Add medicine to inventory" subtitle="Pick from the Katara medication catalog.">
      <form className="modal-form" onSubmit={addMedicine}>
        <label>Medication
          <select name="medicationId" required defaultValue="">
            <option value="" disabled>Select a medication</option>
            {(catalog ?? []).map((m) => <option key={m.id} value={m.id}>{m.name} — {m.genericName}</option>)}
          </select>
        </label>
        <div className="form-two">
          <label>Stock<input name="stock" type="number" min="0" defaultValue={0} required /></label>
          <label>Reorder at<input name="reorderAt" type="number" min="0" defaultValue={20} required /></label>
        </div>
        <div className="form-two">
          <label>Batch<input name="batch" placeholder="B1042" /></label>
          <label>Supplier<input name="supplier" placeholder="Mersaco" /></label>
        </div>
        <div className="form-two">
          <label>Retail price (LBP)<input name="retailPrice" type="number" min="0" step="1000" /></label>
          <label>Expiry<input name="expiry" type="date" /></label>
        </div>
        {formError && <div className="form-error">{formError}</div>}
        <button className="primary-button wide" disabled={busy}>{busy ? 'Adding…' : 'Add to inventory'}</button>
      </form>
    </Modal>
  </PortalShell>;
}

export default function InventoryPageRoute() {
  return <Suspense fallback={<div className="page-loader"><div className="loader-ring" /></div>}><InventoryPage /></Suspense>;
}
