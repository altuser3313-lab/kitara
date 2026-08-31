'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, MapPin, Pill, Search } from 'lucide-react';
import { formatLbp, globalSearch } from '@/lib/api';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

function medicineHref(role, medication) {
  if (role === 'pharmacy') return `/pharmacy/inventory?q=${encodeURIComponent(medication.brandName)}`;
  if (role === 'admin') return `/admin/database?medicine=${encodeURIComponent(medication.brandName)}`;
  return `/customer/map?medicine=${encodeURIComponent(medication.name)}`;
}

function pharmacyHref(role, pharmacy) {
  if (role === 'admin') return `/admin/database?search=${encodeURIComponent(pharmacy.name)}`;
  return `/customer/map?pharmacy=${pharmacy.id}`;
}

export default function GlobalSearch({ role }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef(null);

  const showPharmacies = role !== 'pharmacy';

  const items = useMemo(() => {
    if (!results) return [];
    return [
      ...results.medications.map((m) => ({ kind: 'medication', key: `m${m.id}`, data: m, href: medicineHref(role, m) })),
      ...(showPharmacies
        ? results.pharmacies.map((p) => ({ kind: 'pharmacy', key: `p${p.id}`, data: p, href: pharmacyHref(role, p) }))
        : [])
    ];
  }, [results, role, showPharmacies]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await globalSearch(trimmed);
        if (!cancelled) { setResults(data); setActive(0); }
      } catch {
        if (!cancelled) setResults({ medications: [], pharmacies: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function choose(item) {
    if (!item) return;
    setOpen(false);
    setQuery('');
    setResults(null);
    router.push(item.href);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur(); return; }
    if (!items.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => (i + 1) % items.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive((i) => (i - 1 + items.length) % items.length); }
    if (event.key === 'Enter') { event.preventDefault(); choose(items[active]); }
  }

  const showPanel = open && query.trim().length >= MIN_QUERY;

  return (
    <div className="global-search-wrap" ref={containerRef}>
      <div className="global-search">
        {loading ? <Loader2 size={17} className="spin" /> : <Search size={17} />}
        <input
          aria-label="Search Katara"
          placeholder="Search medicine or pharmacy…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
autoComplete="off"
        />
      </div>

      {showPanel && <div className="search-results" id="global-search-results" role="listbox">
        {loading && !results && <p className="search-empty">Searching…</p>}
        {!loading && results && !items.length && <p className="search-empty">Nothing matches “{query.trim()}”.</p>}

        {results?.medications.length > 0 && <>
          <div className="search-group">Medicines · across all pharmacies</div>
          {results.medications.map((m) => {
            const index = items.findIndex((i) => i.key === `m${m.id}`);
            return <button
              key={m.id}
              role="option"
              aria-selected={index === active}
              className={`search-row ${index === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(items[index])}
            >
              <span className="search-icon medicine"><Pill size={15} /></span>
              <span className="search-body">
                <strong>{m.name}</strong>
                <small>{m.genericName} · {m.category}{m.prescriptionRequired ? ' · prescription' : ''}</small>
              </span>
              <span className="search-meta">
                <b>{m.pharmacyCount ? `${m.pharmacyCount} pharmac${m.pharmacyCount === 1 ? 'y' : 'ies'}` : 'Out of stock'}</b>
                <small>
                  {role === 'pharmacy'
                    ? `${m.yourStock} in your stock`
                    : m.fromPrice ? `from ${formatLbp(m.fromPrice)}` : `${m.units} units`}
                </small>
              </span>
            </button>;
          })}
        </>}

        {showPharmacies && results?.pharmacies.length > 0 && <>
          <div className="search-group">Pharmacies</div>
          {results.pharmacies.map((p) => {
            const index = items.findIndex((i) => i.key === `p${p.id}`);
            return <button
              key={p.id}
              role="option"
              aria-selected={index === active}
              className={`search-row ${index === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(items[index])}
            >
              <span className="search-icon pharmacy"><Building2 size={15} /></span>
              <span className="search-body">
                <strong>{p.name}</strong>
                <small><MapPin size={11} />{p.address}, {p.city}</small>
              </span>
              {p.status !== 'verified' && <span className="search-meta"><b>{p.status}</b></span>}
            </button>;
          })}
        </>}
      </div>}
    </div>
  );
}
