'use client';

import { useEffect, useState } from 'react';
import { Clock3, MapPin, Save, ShieldCheck, Store } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { Badge, SectionCard } from '@/components/UI';
import { fetchPharmacyProfile, updatePharmacyProfile } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

const EMPTY = { name: '', licenseNumber: '', phone: '', email: '', address: '', city: '', latitude: '', longitude: '', openingHours: '' };

export default function PharmacyProfilePage() {
  const { data, loading, error, reload } = useApi(fetchPharmacyProfile, []);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name ?? '', licenseNumber: data.licenseNumber ?? '', phone: data.phone ?? '',
      email: data.email ?? '', address: data.address ?? '', city: data.city ?? '',
      latitude: data.latitude ?? '', longitude: data.longitude ?? '', openingHours: data.openingHours ?? ''
    });
  }, [data]);

  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setSaved(false); };

  async function save() {
    setSaving(true);
    setSaveError('');
    try {
      await updatePharmacyProfile({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) });
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return <PortalShell
    role="pharmacy"
    eyebrow="PUBLIC PHARMACY RECORD"
    title="Pharmacy profile"
    actions={<button className="primary-button" onClick={save} disabled={saving || loading}><Save size={16} />{saving ? 'Saving…' : saved ? 'Saved' : 'Save profile'}</button>}
  >
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}
    {saveError && <div className="form-error api-banner">{saveError}</div>}

    <div className="profile-grid">
      <div className="profile-main">
        <SectionCard title="Pharmacy details" subtitle="Information customers see when choosing a pharmacy.">
          <div className="form-grid">
            <label>Pharmacy name<input value={form.name} onChange={set('name')} /></label>
            <label>License number<input value={form.licenseNumber} onChange={set('licenseNumber')} /></label>
            <label>Phone<input value={form.phone} onChange={set('phone')} /></label>
            <label>Email<input value={form.email} onChange={set('email')} /></label>
            <label className="span-two">Street address<input value={form.address} onChange={set('address')} /></label>
            <label>City / area<input value={form.city} onChange={set('city')} /></label>
            <label>Opening hours<input value={form.openingHours} onChange={set('openingHours')} placeholder="8:00 AM - 10:00 PM" /></label>
            <label>Latitude<input value={form.latitude} onChange={set('latitude')} /></label>
            <label>Longitude<input value={form.longitude} onChange={set('longitude')} /></label>
          </div>
        </SectionCard>

        <SectionCard title="Opening hours" subtitle="Drives the open/closed badge on the customer map.">
          <p className="empty-note">
            This pharmacy is currently published as <strong>{form.openingHours || 'unset'}</strong>. Per-day hours are a
            normalized table in the contract; the MVP stores a single published range on the pharmacies row.
          </p>
        </SectionCard>
      </div>

      <aside className="profile-side">
        <div className="public-preview">
          <span className="preview-cover"><Store size={29} /></span>
          <Badge tone={data?.verificationStatus === 'verified' ? 'success' : 'warning'}>{data?.verificationStatus ?? '—'}</Badge>
          <h3>{form.name || '—'}</h3>
          <p><MapPin size={14} />{form.city}</p>
          <p><Clock3 size={14} />{form.openingHours}</p>
          <div><strong>{data?.rating ?? '—'}</strong><small>Customer rating</small></div>
        </div>
        <div className="privacy-card">
          <ShieldCheck size={20} />
          <h3>Verification status</h3>
          <p>Your pharmacy license and ownership documents are reviewed by Katara administrators before the pharmacy appears on the customer map.</p>
          <Badge tone={data?.verificationStatus === 'verified' ? 'success' : 'warning'}>
            {data?.verificationStatus === 'verified'
              ? `Verified ${data?.verifiedAt ? new Date(data.verifiedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`
              : 'Awaiting review'}
          </Badge>
        </div>
        <div className="privacy-card">
          <ShieldCheck size={20} />
          <h3>Subscription</h3>
          <p>{data?.subscriptionPlan ?? '—'} plan · Katara code {data?.id ? `#${data.id}` : '—'}</p>
        </div>
      </aside>
    </div>
  </PortalShell>;
}
