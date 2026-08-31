'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ChevronRight, Clock3, LocateFixed, MapPin, Navigation, Search, ShoppingBag, Star } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { Modal, Progress, SuccessState } from '@/components/UI';
import { createReservation, fetchPharmacies, formatLbp } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

const BOUNDS = { south: 33.05, north: 34.69, west: 35.1, east: 36.62 };

function project({ latitude, longitude }) {
  const x = ((longitude - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 80 + 10;
  const y = ((BOUNDS.north - latitude) / (BOUNDS.north - BOUNDS.south)) * 80 + 10;
  return { x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) };
}

function CustomerMapPage() {
  const params = useSearchParams();
  const medicineParam = params.get('medicine') || '';
  const pharmacyParam = params.get('pharmacy');

  const [query, setQuery] = useState('');
  const [medicineFilter, setMedicineFilter] = useState(medicineParam);
  const [selectedId, setSelectedId] = useState(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [medicine, setMedicine] = useState('');
  const [qty, setQty] = useState(1);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, loading, error, reload } = useApi(() => fetchPharmacies({ medicine: medicineFilter }), [medicineFilter]);
  const pharmacies = data?.pharmacies ?? [];

  const filtered = useMemo(
    () => pharmacies.filter((p) => `${p.name} ${p.area}`.toLowerCase().includes(query.toLowerCase())),
    [pharmacies, query]
  );

  useEffect(() => { setMedicineFilter(medicineParam); }, [medicineParam]);

  useEffect(() => {
    if (!pharmacies.length) { setSelectedId(null); return; }
    if (!pharmacies.some((p) => p.id === selectedId)) setSelectedId(pharmacies[0].id);
  }, [pharmacies, selectedId]);

  useEffect(() => {
    if (!pharmacyParam) return;
    const id = Number(pharmacyParam);
    if (pharmacies.some((p) => p.id === id)) setSelectedId(id);
  }, [pharmacyParam, pharmacies]);

  const selected = pharmacies.find((p) => p.id === selectedId) || null;

  async function reserve(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const created = await createReservation({ pharmacyId: selected.id, medicine, quantity: qty });
      setSuccess(created);
      reload();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <PortalShell role="customer" eyebrow="CUSTOMER · LIVE PHARMACY NETWORK" title="Find your medicine">
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}

    <div className="map-page-grid">
      <section className="pharmacy-results-panel">
        <div className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pharmacy or area" /><button title="Use my location"><LocateFixed size={18} /></button></div>
        <div className="medicine-filter">
          <input
            value={medicineFilter}
            onChange={(e) => setMedicineFilter(e.target.value)}
            placeholder="Filter by medicine in stock (e.g. Augmentin)"
            aria-label="Filter by medicine in stock"
          />
        </div>
        <div className="result-summary">
          <strong>{loading ? 'Searching…' : `${filtered.length} pharmac${filtered.length === 1 ? 'y' : 'ies'} nearby`}</strong>
          <span>{medicineFilter ? 'Stocking your medicine' : 'Sorted by distance'}</span>
        </div>
        <div className="pharmacy-list">
          {!loading && !filtered.length && <p className="empty-note">No verified pharmacy matches that search.</p>}
          {filtered.map((p) => <button key={p.id} className={`pharmacy-list-item ${selectedId === p.id ? 'selected' : ''}`} onClick={() => setSelectedId(p.id)}>
            <div className="pharmacy-icon">+</div>
            <div className="pharmacy-list-main">
              <div className="list-title-row"><strong>{p.name}</strong><span className={p.open ? 'open-text' : 'closed-text'}>{p.open ? 'Open' : 'Closed'}</span></div>
              <span className="muted-line"><MapPin size={13} />{p.area} · {p.distance}</span>
              {p.matched
                ? <div className="availability-line"><span>{p.matched.name} · {p.matched.quantity} in stock</span><Progress value={100} /></div>
                : <div className="availability-line"><span>{p.stockMatch}% of catalog in stock</span><Progress value={p.stockMatch} /></div>}
            </div>
            <ChevronRight size={17} />
          </button>)}
        </div>
      </section>

      <section className="map-stage" aria-label="Interactive pharmacy map preview">
        <div className="map-grid-lines" /><div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" /><div className="map-road road-d" /><div className="map-water" />
        <span className="district d1">BEIRUT</span><span className="district d2">SHOUF</span><span className="district d3">BEKAA</span><span className="district d4">NORTH</span>
        {pharmacies.map((p) => {
          const { x, y } = project(p);
          return <button key={p.id} aria-label={p.name} className={`map-pin ${selectedId === p.id ? 'active' : ''} ${!p.open ? 'closed' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => setSelectedId(p.id)}>+</button>;
        })}
        {data?.origin && (() => { const { x, y } = project({ latitude: data.origin.lat, longitude: data.origin.lng }); return <div className="you-marker" style={{ left: `${x}%`, top: `${y}%` }}><span /><small>You</small></div>; })()}
        <div className="map-controls"><button><Navigation size={17} /></button><button>+</button><button>−</button></div>
        <div className="map-provider-note">Amazon Location ready</div>
      </section>

      <aside className="pharmacy-detail-panel">
        {!selected && <div className="detail-content"><p className="empty-note">{loading ? 'Loading pharmacies…' : 'Select a pharmacy to see details.'}</p></div>}
        {selected && <>
          <div className="detail-image"><span className="detail-pharmacy-mark">+</span><div className="distance-pill"><Navigation size={13} />{selected.distance}</div></div>
          <div className="detail-content">
            <div className="detail-title">
              <div><span className={selected.open ? 'open-text' : 'closed-text'}>{selected.open ? '● Open now' : '● Closed'}</span><h2>{selected.name}</h2></div>
              <div className="rating"><Star size={14} fill="currentColor" />{selected.rating}</div>
            </div>
            <p className="detail-address"><MapPin size={15} />{selected.address}, {selected.area}</p>
            <div className="mini-info-grid">
              <div><Clock3 size={16} /><span><small>Hours</small><strong>{selected.hours}</strong></span></div>
              <div><ShoppingBag size={16} /><span><small>{selected.matched ? 'Your medicine' : 'Catalog in stock'}</small><strong>{selected.matched ? `${selected.matched.quantity} units` : `${selected.stockMatch}%`}</strong></span></div>
            </div>
            {selected.matched && <p className="matched-price">{selected.matched.name} · {formatLbp(selected.matched.price)}{selected.matched.prescriptionRequired ? ' · prescription required' : ''}</p>}
            <button
              className="primary-button wide"
              onClick={() => { setReserveOpen(true); setSuccess(null); setFormError(''); setMedicine(selected.matched?.name || medicineFilter || ''); }}
              disabled={!selected.open}
            >Reserve medication</button>
            <a className="secondary-button wide" href={`tel:${selected.phone}`}>Call {selected.phone}</a>
            <div className="reservation-flow">
              <strong>How reservation works</strong>
              <div><span>1</span><p><b>Send request</b><small>Tell the pharmacy what you need.</small></p></div>
              <div><span>2</span><p><b>Pharmacy confirms</b><small>You receive accept / decline status.</small></p></div>
              <div><span>3</span><p><b>Collect safely</b><small>Bring required prescription and ID.</small></p></div>
            </div>
          </div>
        </>}
      </aside>
    </div>

    <Modal open={reserveOpen} onClose={() => setReserveOpen(false)} title={`Reserve at ${selected?.name ?? ''}`} subtitle="The pharmacy will receive this request and can accept or decline it.">
      {success
        ? <SuccessState title={`Request ${success.id} sent`} text="Your reservation is pending pharmacy confirmation. Katara will update the status as soon as the pharmacy responds." onDone={() => setReserveOpen(false)} />
        : <form className="modal-form" onSubmit={reserve}>
            <label>Medication<input required value={medicine} onChange={(e) => setMedicine(e.target.value)} placeholder="e.g. Augmentin 1g" /></label>
            <div className="form-two">
              <label>Quantity<input type="number" min="1" max="10" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></label>
              <label>Prescription<select><option>Not required / unsure</option><option>I have a prescription</option><option>Use saved prescription</option></select></label>
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="info-banner"><CheckCircle2 size={18} /><span>Submitting a reservation does not guarantee dispensing. The pharmacist makes the final clinical and legal decision.</span></div>
            <button className="primary-button wide" disabled={busy}>{busy ? 'Sending…' : 'Send reservation request'}</button>
          </form>}
    </Modal>
  </PortalShell>;
}

export default function CustomerMapPageRoute() {
  return <Suspense fallback={<div className="page-loader"><div className="loader-ring" /></div>}><CustomerMapPage /></Suspense>;
}
