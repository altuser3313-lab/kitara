'use client';

import { AlertTriangle, ArrowRight, BrainCircuit, CalendarClock, PackagePlus, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { Badge, SectionCard, StatCard } from '@/components/UI';
import { fetchForecasts } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

const RISK_TONE = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'success' };

export default function PredictionsPage() {
  const { data, loading, error, reload } = useApi(fetchForecasts, []);
  const forecasts = data?.forecasts ?? [];
  const summary = data?.summary;

  const signals = Object.entries(
    forecasts.reduce((acc, f) => {
      acc[f.category] = acc[f.category] || { demand: 0, lines: 0 };
      acc[f.category].demand += f.dailyDemand;
      acc[f.category].lines += 1;
      return acc;
    }, {})
  )
    .map(([category, v]) => ({ category, perDay: v.demand / v.lines }))
    .sort((a, b) => b.perDay - a.perDay);
  const peak = signals[0]?.perDay || 1;

  return <PortalShell
    role="pharmacy"
    eyebrow="PREDICTIVE INVENTORY · DEMAND MODEL"
    title="Stock forecast"
    actions={<button className="primary-button" onClick={reload} disabled={loading}><Sparkles size={16} />{loading ? 'Running…' : 'Run forecast'}</button>}
  >
    {error && <div className="form-error api-banner">{apiErrorMessage(error)}</div>}

    <div className="forecast-hero">
      <div>
        <span className="hero-ai-icon"><BrainCircuit size={25} /></span>
        <div>
          <small>KATARA DEMAND MODEL</small>
          <h2>{summary ? `${summary.stockoutRisks} product${summary.stockoutRisks === 1 ? '' : 's'} may stock out within ${summary.horizonDays} days.` : 'Calculating…'}</h2>
          <p>Daily demand comes from this pharmacy&apos;s reservation and dispensing history. Lines without history yet use a category baseline and are labelled as such.</p>
        </div>
      </div>
      <button>Review suggested purchase order <ArrowRight size={16} /></button>
    </div>

    <div className="stats-grid four">
      <StatCard icon={AlertTriangle} value={summary ? String(summary.stockoutRisks) : '—'} label={`${summary?.horizonDays ?? 7}-day stockout risks`} detail={summary ? `${summary.criticalRisks} critical` : ''} />
      <StatCard icon={TrendingUp} value={summary ? String(summary.observedLines) : '—'} label="Lines with real history" detail={summary ? `of ${summary.totalLines} stocked lines` : ''} />
      <StatCard icon={PackagePlus} value={summary ? String(summary.suggestedUnits) : '—'} label="Suggested reorder units" detail="Pharmacist approval required" />
      <StatCard icon={CalendarClock} value={summary ? `${summary.confidence}%` : '—'} label="Forecast confidence" detail="Share based on observed demand" />
    </div>

    <SectionCard title="Highest priority forecasts" subtitle="Recommended actions remain pharmacist-controlled.">
      <div className="forecast-table">
        <div className="forecast-head"><span>Medication</span><span>Current stock</span><span>Est. stockout</span><span>Daily demand</span><span>Recommendation</span><span>Risk</span></div>
        {loading && <p className="empty-note">Running forecast…</p>}
        {!loading && !forecasts.length && <p className="empty-note">No stocked lines to forecast.</p>}
        {forecasts.map((f) => <div className="forecast-row" key={f.inventoryId}>
          <strong>{f.name}</strong>
          <span>{f.currentStock} units</span>
          <span><b>{f.daysToStockout > 365 ? '1 year+' : `${f.daysToStockout} days`}</b></span>
          <span className={f.basis === 'observed' ? 'demand-up' : ''}>
            {f.basis === 'observed' && <TrendingUp size={14} />}
            {f.dailyDemand}/day
            <small className="block-muted">{f.basis === 'observed' ? 'observed' : 'baseline'}</small>
          </span>
          <span>{f.recommendation}</span>
          <Badge tone={RISK_TONE[f.risk]}>{f.risk}</Badge>
        </div>)}
      </div>
    </SectionCard>

    <div className="two-column-panels">
      <SectionCard title="Demand signals" subtitle="Average projected daily demand per category.">
        <div className="signal-bars">
          {!signals.length && <p className="empty-note">No categories stocked yet.</p>}
          {signals.map((s) => <div key={s.category}>
            <span>{s.category}</span>
            <div><i style={{ width: `${Math.round((s.perDay / peak) * 100)}%` }} /></div>
            <b>{s.perDay.toFixed(1)}/day</b>
          </div>)}
        </div>
      </SectionCard>
      <SectionCard title="Model guardrails">
        <div className="guardrail-list">
          <p><span><TrendingDown size={16} /></span><strong>No automatic purchasing</strong><small>Suggestions require pharmacy approval.</small></p>
          <p><span><BrainCircuit size={16} /></span><strong>Explainable inputs</strong><small>Every row shows whether it is observed or a baseline.</small></p>
          <p><span><AlertTriangle size={16} /></span><strong>Honest confidence</strong><small>Confidence is the share of lines with real history, not a model score.</small></p>
        </div>
      </SectionCard>
    </div>
  </PortalShell>;
}
