'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import { portalNavigation } from '@/lib/navigation';
import { useAuth } from '@/lib/auth-context';
import GlobalSearch from './GlobalSearch';

const roleHome = { customer: '/customer/map', pharmacy: '/pharmacy/inventory', admin: '/admin/dashboard' };

export default function PortalShell({ role, title, eyebrow, actions, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user && user.role !== role) router.replace(roleHome[user.role] || '/login');
  }, [loading, user, role, router]);

  if (loading || !user || user.role !== role) return <div className="page-loader"><div className="loader-ring" /><Logo /></div>;
  const nav = portalNavigation[role];

  async function handleLogout() {
    await signOut();
    router.replace('/login');
  }

  return (
    <div className="portal-layout">
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-head">
          <Link href={roleHome[role]} aria-label="Katara home"><Logo /></Link>
          <button className="icon-button mobile-only" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-badge">
          <span className={`workspace-dot ${role}`} />
          <div><small>Workspace</small><strong>{role === 'customer' ? 'Personal' : role === 'pharmacy' ? 'Pharmacy portal' : 'Administration'}</strong></div>
          <ChevronDown size={15} />
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} onClick={() => setMobileOpen(false)}><Icon size={19} /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="support-card"><span className="mini-pulse" /><strong>Katara network</strong><p>Secure pharmacy connectivity</p></div>
          <button className="logout-button" onClick={handleLogout}><LogOut size={18} /> Sign out</button>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <main className="portal-main">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button menu-button" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><GlobalSearch role={role} /></div>
          <div className="topbar-right">
            <button className="icon-button notification-button"><Bell size={19} /><span className="notification-dot" /></button>
            <div className="user-chip"><span className="avatar">{user.name?.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><span>{role === 'admin' ? 'System administrator' : role === 'pharmacy' ? 'Verified pharmacy' : 'Katara member'}</span></div></div>
          </div>
        </header>
        <div className="content-wrap">
          <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>{actions && <div className="page-actions">{actions}</div>}</div>
          {children}
        </div>
      </main>
    </div>
  );
}
