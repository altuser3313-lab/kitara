'use client';

import { useState } from 'react';
import { Building2, Check, FileCheck2, MapPin, ShieldCheck, X } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { Badge } from '@/components/UI';
import { approveVerification, fetchVerifications, rejectVerification } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

const DOC_TONE = { received: 'success', review: 'warning', rejected: 'danger' };

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export default function VerificationPage() {
  const { data, loading, error, reload } = useApi(fetchVerifications, []);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');

  const requests = data ?? [];
  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  async function decide(id, decision) {
    setBusy(id);
    setActionError('');
    try {
      await (decision === 'approve' ? approveVerification(id) : rejectVerification(id));
      await reload();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return <PortalShell role="admin" eyebrow="TRUST & ONBOARDING" title="Pharmacy verification">
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}
    {actionError && <div className="form-error api-banner">{actionError}</div>}

    <div className="verification-intro">
      <span><ShieldCheck size={24} /></span>
      <div>
        <h2>{loading ? 'Loading applications…' : `${pending.length} application${pending.length === 1 ? '' : 's'} waiting for review`}</h2>
        <p>Verify licensing, ownership, location and required documents before a pharmacy can join the live Katara network. Approving flips the pharmacy to verified, which is what puts it on the customer map.</p>
      </div>
    </div>

    <div className="verification-list">
      {pending.map((r) => <article key={r.id} className="verification-card">
        <div className="verification-store">
          <span>+</span>
          <div><small>{r.reference}</small><h3>{r.pharmacy}</h3><p><MapPin size={13} />{r.address}, {r.city}</p></div>
        </div>
        <div className="verification-details">
          <div><small>OWNER / PHARMACIST</small><strong>{r.owner}</strong></div>
          <div><small>LICENSE NUMBER</small><strong className="mono">{r.license}</strong></div>
          <div><small>SUBMITTED</small><strong>{formatDate(r.submittedAt)}</strong></div>
        </div>
        <div className="document-checks">
          {r.documents.map((doc) => <div key={doc.type}>
            {doc.type === 'Location evidence' ? <Building2 size={16} /> : <FileCheck2 size={16} />}
            <span><strong>{doc.type}</strong><small>{doc.status === 'received' ? 'Document received' : 'Needs manual review'}</small></span>
            <Badge tone={DOC_TONE[doc.status] || 'neutral'}>{doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}</Badge>
          </div>)}
        </div>
        <div className="verification-actions">
          <button className="decline-button" disabled={busy === r.id} onClick={() => decide(r.id, 'reject')}><X size={16} />Reject</button>
          <button className="secondary-button">Open all {r.documents.length} documents</button>
          <button className="accept-button" disabled={busy === r.id} onClick={() => decide(r.id, 'approve')}><Check size={16} />{busy === r.id ? 'Saving…' : 'Verify pharmacy'}</button>
        </div>
      </article>)}
    </div>

    {!loading && pending.length === 0 && <div className="empty-state"><span><ShieldCheck size={24} /></span><h3>Verification queue is clear</h3><p>New pharmacy applications will appear here.</p></div>}

    {reviewed.length > 0 && <section className="table-card">
      <div className="table-toolbar"><strong>Reviewed</strong></div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Reference</th><th>Pharmacy</th><th>License</th><th>Decision</th><th>Reviewed</th></tr></thead>
          <tbody>{reviewed.map((r) => <tr key={r.id}>
            <td className="mono">{r.reference}</td>
            <td><strong>{r.pharmacy}</strong><small className="block-muted">{r.city}</small></td>
            <td className="mono">{r.license}</td>
            <td><Badge tone={r.status === 'approved' ? 'success' : 'danger'}>{r.status}</Badge></td>
            <td>{formatDate(r.reviewedAt)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>}
  </PortalShell>;
}
