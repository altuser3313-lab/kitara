import { MapPinned, Sparkles, UserRound, FileText, Database, MessagesSquare, BrainCircuit, Store, LayoutDashboard, ShieldCheck } from 'lucide-react';

export const portalNavigation = {
  customer: [
    { href: '/customer/map', label: 'Find medicine', icon: MapPinned },
    { href: '/customer/substitutes', label: 'AI substitutes', icon: Sparkles },
    { href: '/customer/profile', label: 'My health', icon: UserRound },
    { href: '/customer/prescriptions', label: 'Prescriptions', icon: FileText }
  ],
  pharmacy: [
    { href: '/pharmacy/inventory', label: 'Inventory', icon: Database },
    { href: '/pharmacy/reservations', label: 'Reservations', icon: MessagesSquare },
    { href: '/pharmacy/predictions', label: 'AI forecast', icon: BrainCircuit },
    { href: '/pharmacy/profile', label: 'Pharmacy profile', icon: Store }
  ],
  admin: [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/database', label: 'Master database', icon: Database },
    { href: '/admin/verification', label: 'Verification', icon: ShieldCheck }
  ]
};
