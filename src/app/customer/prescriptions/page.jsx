'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Eye, FileCheck2, FileText, ShieldCheck, UploadCloud } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { Badge, SectionCard } from '@/components/UI';
import { fetchPrescriptions, uploadPrescription } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

const STATUS_TONE = { valid: 'success', pending: 'warning', rejected: 'danger', archived: 'neutral' };

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PrescriptionsPage() {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const { data: documents, loading, error: loadError, reload } = useApi(fetchPrescriptions, []);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadPrescription(file, { type: 'doctor-prescription' });
      setUploaded(true);
      reload();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return <PortalShell role="customer" eyebrow="SECURE DOCUMENTS" title="Doctor prescriptions">
    {loadError && <div className="form-error api-banner">{apiErrorMessage(loadError)}</div>}
    <div className="prescription-grid">
      <section className={`upload-zone ${uploaded ? 'uploaded' : ''}`} onClick={() => inputRef.current?.click()}>
        {uploaded
          ? <><span className="upload-icon success"><CheckCircle2 size={28} /></span><h2>Prescription uploaded</h2><p>Your document is ready to attach to a pharmacy reservation.</p><button className="secondary-button" onClick={(e) => { e.stopPropagation(); setUploaded(false); }}>Upload another</button></>
          : <><span className="upload-icon"><UploadCloud size={28} /></span><h2>{uploading ? 'Uploading securely…' : 'Upload an official prescription'}</h2><p>PDF, JPG or PNG · Recommended maximum 10 MB</p><button className="primary-button" disabled={uploading}>Choose file</button><input ref={inputRef} type="file" accept=".pdf,image/png,image/jpeg" onChange={onFile} hidden /></>}
        {error && <div className="form-error">{error}</div>}
        <div className="s3-ready"><ShieldCheck size={15} />Presigned-upload flow · S3 ready</div>
      </section>

      <SectionCard title="Saved prescriptions" subtitle="Documents available to attach to reservation requests.">
        <div className="document-list">
          {loading && <p className="empty-note">Loading documents…</p>}
          {!loading && !documents?.length && <p className="empty-note">No prescriptions uploaded yet.</p>}
          {documents?.map((doc) => <div key={doc.id}>
            <span className="doc-icon"><FileText size={19} /></span>
            <div>
              <strong>{doc.physician ? `Prescription · ${doc.physician}` : doc.fileName}</strong>
              <small>Uploaded {formatDate(doc.uploadedAt)}{doc.contentType ? ` · ${doc.contentType.split('/').pop().toUpperCase()}` : ''}</small>
            </div>
            <Badge tone={STATUS_TONE[doc.status] || 'neutral'}>
              {doc.status === 'valid' && <FileCheck2 size={12} />}
              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
            </Badge>
            <button className="icon-button"><Eye size={17} /></button>
          </div>)}
        </div>
      </SectionCard>
    </div>
  </PortalShell>;
}
