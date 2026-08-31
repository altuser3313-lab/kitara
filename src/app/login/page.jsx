'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Eye, EyeOff, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { apiErrorMessage } from '@/lib/use-api';

const roleHome = { customer: '/customer/map', pharmacy: '/pharmacy/inventory', admin: '/admin/dashboard' };
const roles = [
  { id: 'customer', label: 'Customer', icon: UserRound, desc: 'Find and reserve medicine' },
  { id: 'pharmacy', label: 'Pharmacy', icon: Building2, desc: 'Manage stock and requests' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, desc: 'Operate the Katara network' }
];

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, cognitoReady } = useAuth();
  const [role, setRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!loading && user) router.replace(roleHome[user.role]); }, [user, loading, router]);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const result = await signIn({ email, password, role });
      if (result.ok) router.push(roleHome[result.user.role]);
      else setError('Cognito requires an additional sign-in step.');
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function demoLogin(selectedRole) {
    setRole(selectedRole); setBusy(true); setError('');
    try {
      const result = await signIn({ role: selectedRole });
      router.push(roleHome[result.user.role]);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-brand-panel">
      <div className="login-brand-top"><Logo /></div>
      <div className="brand-message"><span className="hero-kicker"><Sparkles size={15} /> Connected pharmacy care</span><h1>Medicine, when and where you need it.</h1><p>Katara connects patients with nearby pharmacies, live availability, safe alternatives and trusted prescription workflows.</p><div className="trust-row"><span><i />Verified pharmacies</span><span><i />Protected health data</span><span><i />Smarter availability</span></div></div>
      <div className="abstract-map"><span className="route-line line-one" /><span className="route-line line-two" /><span className="map-node node-one">+</span><span className="map-node node-two">+</span><span className="map-node node-three">+</span><div className="availability-card"><span>Nearby availability</span><strong>12 pharmacies</strong><small>within 3 km</small></div></div>
    </section>
    <section className="login-form-panel">
      <div className="login-form-wrap"><div className="mobile-login-logo"><Logo /></div><div className="login-heading"><span className="eyebrow">WELCOME TO KATARA</span><h2>Sign in to your account</h2><p>{cognitoReady ? 'Your login is connected to Amazon Cognito.' : 'Signed in against the local Katara API. Seeded accounts use the password katara1234.'}</p></div>
        <div className="role-selector">{roles.map(({ id, label, icon: Icon, desc }) => <button type="button" key={id} className={role === id ? 'selected' : ''} onClick={() => setRole(id)}><Icon size={20} /><strong>{label}</strong><span>{desc}</span></button>)}</div>
        <form onSubmit={submit} className="login-form"><label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required={cognitoReady} /></label><label>Password<div className="password-input"><input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required={cognitoReady} /><button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <div className="form-error">{error}</div>}<button className="primary-button login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} /></button></form>
        {!cognitoReady && <div className="demo-zone"><div className="separator"><span>or open a seeded workspace</span></div><div className="demo-buttons">{roles.map((r) => <button key={r.id} onClick={() => demoLogin(r.id)}>Demo {r.label}</button>)}</div></div>}
        <p className="login-footnote">By continuing, you agree to Katara's privacy and acceptable-use policies. Health information must be handled according to applicable regulations.</p>
      </div>
    </section>
  </main>;
}
