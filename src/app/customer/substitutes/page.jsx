'use client';

import { useState } from 'react';
import { ArrowUp, Bot, CheckCircle2, Info, PackageCheck, Pill, Sparkles } from 'lucide-react';
import PortalShell from '@/components/PortalShell';
import { askSubstituteModel, fetchMedications, fetchPharmacies, formatLbp } from '@/lib/api';
import { useApi, apiErrorMessage } from '@/lib/use-api';

export default function SubstitutesPage() {
  const [medicine, setMedicine] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Tell me the medication you cannot find. I’ll rank alternatives against live pharmacy stock and explain what to confirm with a pharmacist.' }]);
  const [busy, setBusy] = useState(false);

  const { data: catalog } = useApi(fetchMedications, []);
  const { data: network } = useApi(() => fetchPharmacies(), []);
  const starterPrompts = (catalog ?? []).slice(0, 3).map((m) => m.name);

  async function ask(value = medicine) {
    if (!value.trim()) return;
    const q = value.trim();
    setMedicine('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const response = await askSubstituteModel({ medicine: q, location: 'Beirut' });
      setMessages((m) => [...m, { role: 'assistant', text: response.message, options: response.options }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: apiErrorMessage(err), options: [] }]);
    } finally {
      setBusy(false);
    }
  }

  return <PortalShell role="customer" eyebrow="KATARA ASSIST · AVAILABILITY AI" title="Find a likely substitute">
    <div className="assistant-layout">
      <section className="assistant-chat">
        <div className="assistant-banner"><span><Sparkles size={18} /></span><div><strong>Katara Substitute Assistant</strong><p>Availability-aware suggestions designed to be verified by a licensed pharmacist.</p></div><span className="ai-status">AI online</span></div>
        <div className="chat-thread">
          {messages.map((msg, i) => <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-avatar">{msg.role === 'assistant' ? <Bot size={18} /> : 'MK'}</div>
            <div className="message-bubble">
              <p>{msg.text}</p>
              {msg.options?.length > 0 && <div className="substitute-options">{msg.options.map((o) => <div key={o.name}>
                <span className="pill-icon"><Pill size={16} /></span>
                <div>
                  <strong>{o.name}</strong>
                  <small>{o.match}{o.fromPrice ? ` · from ${formatLbp(o.fromPrice)}` : ''}{o.prescriptionRequired ? ' · prescription' : ''}</small>
                </div>
                <span className="availability-chip"><PackageCheck size={13} />{o.availability} · {o.stockingPharmacies} pharmacies</span>
              </div>)}</div>}
            </div>
          </div>)}
          {busy && <div className="chat-message assistant"><div className="chat-avatar"><Bot size={18} /></div><div className="typing"><i /><i /><i /></div></div>}
        </div>
        <div className="suggestion-row">{starterPrompts.map((p) => <button key={p} onClick={() => ask(p)}>{p}</button>)}</div>
        <div className="chat-composer">
          <textarea rows="1" value={medicine} onChange={(e) => setMedicine(e.target.value)} placeholder="What medicine are you looking for?" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }} />
          <button onClick={() => ask()} disabled={busy}><ArrowUp size={18} /></button>
        </div>
        <div className="ai-disclaimer"><Info size={14} />Katara does not replace a physician or pharmacist. Substitutions must be clinically appropriate and legally dispensable.</div>
      </section>

      <aside className="assistant-side">
        <div className="safety-card"><span className="safety-icon"><CheckCircle2 size={20} /></span><h3>How suggestions are ranked</h3><p>Every option below comes from the pharmacy database, not a language model:</p><ul><li>Same active ingredient first</li><li>Then same therapeutic class</li><li>Ranked by live stock across pharmacies</li><li>Prescription requirement flagged</li><li>Pharmacist makes the final call</li></ul></div>
        <div className="context-card"><small>YOUR CONTEXT</small><strong>Beirut, Lebanon</strong><p>{network ? `${network.pharmacies.length} connected pharmacies nearby` : 'Loading network…'}</p><button>Update location</button></div>
      </aside>
    </div>
  </PortalShell>;
}
