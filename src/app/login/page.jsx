'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Eye, EyeOff, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { apiErrorMessage } from '@/lib/use-api';

const roleHome = {
  customer: '/customer/map',
  pharmacy: '/pharmacy/inventory',
  admin: '/admin/dashboard'
};

const roles = [
  { id: 'customer', label: 'Customer', icon: UserRound, desc: 'Find medicine, prescriptions, and reservations' },
  { id: 'pharmacy', label: 'Pharmacy', icon: Building2, desc: 'Manage inventory and customer requests' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, desc: 'Review pharmacies and platform activity' }
];

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, cognitoReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState('');
  const busy = Boolean(busyAction);

  useEffect(() => {
    if (!loading && user) router.replace(roleHome[user.role]);
  }, [user, loading, router]);

  async function submit(event) {
    event.preventDefault();
    setBusyAction('credentials');
    setError('');

    try {
      const result = await signIn({ email, password });
      if (result.ok) router.replace(roleHome[result.user.role]);
      else setError('Cognito requires an additional sign-in step.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function demoLogin(selectedRole) {
    setBusyAction(selectedRole);
    setError('');

    try {
      const result = await signIn({ role: selectedRole });
      router.replace(roleHome[result.user.role]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }

  const credentialForm = (
    <form onSubmit={submit} className="login-form" aria-busy={busyAction === 'credentials'}>
      <label>
        Email address
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={busy}
          required
        />
      </label>
      <label>
        Password
        <div className="password-input">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={busy}
            required
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            disabled={busy}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>
      <button className="primary-button login-submit" disabled={busy}>
        {busyAction === 'credentials' ? 'Signing in…' : 'Sign in'}
        <ArrowRight size={17} />
      </button>
    </form>
  );

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-top"><Logo /></div>
        <div className="brand-message">
          <span className="hero-kicker"><Sparkles size={15} /> Connected pharmacy care</span>
          <h1>Medicine, when and where you need it.</h1>
          <p>Katara connects patients with nearby pharmacies, live availability, safe alternatives and trusted prescription workflows.</p>
          <div className="trust-row">
            <span><i />Verified pharmacies</span>
            <span><i />Protected health data</span>
            <span><i />Smarter availability</span>
          </div>
        </div>
        <div className="abstract-map">
          <span className="route-line line-one" />
          <span className="route-line line-two" />
          <span className="map-node node-one">+</span>
          <span className="map-node node-two">+</span>
          <span className="map-node node-three">+</span>
          <div className="availability-card">
            <span>Nearby availability</span>
            <strong>12 pharmacies</strong>
            <small>within 3 km</small>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-logo"><Logo /></div>
          <div className="login-heading">
            <span className="login-mode-label">{cognitoReady ? 'Secure account access' : 'Interactive demo'}</span>
            <h2>{cognitoReady ? 'Sign in to your account' : 'Choose a workspace to explore'}</h2>
            <p>{cognitoReady ? 'Use your Katara account credentials.' : 'No email or password needed. Pick a role and enter instantly.'}</p>
          </div>

          {!cognitoReady ? (
            <>
              <div className="demo-ready-note"><span /> Demo data is ready</div>
              <ul className="demo-login-list" aria-label="Demo workspaces">
                {roles.map(({ id, label, icon: Icon, desc }) => (
                  <li key={id}>
                    <button
                      type="button"
                      className="demo-login-button"
                      onClick={() => demoLogin(id)}
                      disabled={busy}
                      aria-label={`Continue as demo ${label}`}
                    >
                      <span className={`demo-role-icon ${id}`}><Icon size={20} /></span>
                      <span className="demo-role-copy">
                        <strong>Continue as {label}</strong>
                        <small>{desc}</small>
                      </span>
                      <span className="demo-role-action">
                        {busyAction === id ? 'Opening…' : 'Open'}
                        <ArrowRight size={16} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {error && <div className="form-error" role="alert" aria-live="polite">{error}</div>}

              <details className="credential-disclosure">
                <summary>Sign in with email and password</summary>
                <div className="credential-content">
                  {credentialForm}
                  <p>Seeded accounts use <code>katara1234</code>.</p>
                </div>
              </details>
            </>
          ) : (
            <>
              {error && <div className="form-error" role="alert" aria-live="polite">{error}</div>}
              {credentialForm}
            </>
          )}

          <p className="login-footnote">By continuing, you agree to Katara&apos;s privacy and acceptable-use policies. Health information must be handled according to applicable regulations.</p>
        </div>
      </section>
    </main>
  );
}
