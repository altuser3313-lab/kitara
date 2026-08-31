'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, FileText, HeartPulse, LockKeyhole, Mail, Phone, Save, UserRound } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { Badge, SectionCard } from '@/components/UI';
import { fetchMyProfile, updateMyProfile } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

const EMPTY = { fullName: '', email: '', phone: '', dateOfBirth: '', allergiesNote: '' };

export default function CustomerProfilePage() {
  const { data, loading, error, reload } = useApi(fetchMyProfile, []);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!data) return;
    setForm({
      fullName: data.fullName ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '',
      allergiesNote: data.allergiesNote ?? ''
    });
  }, [data]);

  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setSaved(false); };

  async function save() {
    setSaving(true);
    setSaveError('');
    try {
      await updateMyProfile(form);
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const filled = Object.values(form).filter(Boolean).length;
  const completeness = Math.round((filled / Object.keys(EMPTY).length) * 100);
  const initials = (form.fullName || '  ').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return <PortalShell
    role="customer"
    eyebrow="PERSONAL HEALTH PROFILE"
    title="My health information"
    actions={<button className="primary-button" onClick={save} disabled={saving || loading}><Save size={16} />{saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}</button>}
  >
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}
    {saveError && <div className="form-error api-banner">{saveError}</div>}

    <div className="profile-grid">
      <div className="profile-main">
        <SectionCard title="Personal information" subtitle="Used to identify you and support pharmacy requests.">
          <div className="form-grid">
            <label>Full name<div className="field-with-icon"><UserRound size={16} /><input value={form.fullName} onChange={set('fullName')} /></div></label>
            <label>Date of birth<div className="field-with-icon"><CalendarDays size={16} /><input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></div></label>
            <label>Email<div className="field-with-icon"><Mail size={16} /><input value={form.email} onChange={set('email')} /></div></label>
            <label>Phone<div className="field-with-icon"><Phone size={16} /><input value={form.phone} onChange={set('phone')} /></div></label>
          </div>
        </SectionCard>

        <SectionCard title="Medication history" subtitle="Built from your reservation history across the Katara network.">
          <div className="history-list">
            {loading && <p className="empty-note">Loading history…</p>}
            {!loading && !data?.medicationHistory?.length && <p className="empty-note">No medication history yet. It fills in as you reserve medicines.</p>}
            {data?.medicationHistory?.map((item) => <div key={item.name}>
              <span className="med-icon">Rx</span>
              <div><strong>{item.name}</strong><small>{item.genericName}</small></div>
              <Badge tone={item.state === 'Current' ? 'success' : 'neutral'}>{item.state}</Badge>
            </div>)}
          </div>
        </SectionCard>

        <SectionCard title="Allergies & notes" subtitle="Important information to surface during medication-related workflows.">
          <textarea className="large-textarea" value={form.allergiesNote} onChange={set('allergiesNote')} />
        </SectionCard>
      </div>

      <aside className="profile-side">
        <div className="profile-card">
          <div className="profile-avatar">{initials}</div>
          <h3>{form.fullName || '—'}</h3>
          <span>Katara member</span>
          <div className="profile-completion"><div><strong>Profile completeness</strong><span>{completeness}%</span></div><div className="progress"><span style={{ width: `${completeness}%` }} /></div></div>
        </div>
        <div className="privacy-card"><LockKeyhole size={20} /><h3>Health data privacy</h3><p>Only authorized workflows should expose medical information to pharmacies. Backend authorization will enforce role and record-level access.</p></div>
        <div className="mini-summary">
          <div><HeartPulse size={18} /><span><strong>{data?.medicationHistory?.length ?? 0}</strong><small>Health records</small></span></div>
          <div><FileText size={18} /><span><strong>{data?.prescriptionCount ?? 0}</strong><small>Prescriptions</small></span></div>
        </div>
      </aside>
    </div>
  </PortalShell>;
}
