export const pharmacies = [
  {
    id: 'ph-001',
    name: 'Cedar Care Pharmacy',
    area: 'Hamra, Beirut',
    address: 'Hamra Street, Beirut',
    distance: '0.8 km',
    rating: 4.9,
    open: true,
    hours: '08:00 – 23:00',
    phone: '+961 1 555 410',
    stockMatch: 93,
    x: 48,
    y: 46
  },
  {
    id: 'ph-002',
    name: 'Blue Cross Pharmacy',
    area: 'Verdun, Beirut',
    address: 'Verdun 732, Beirut',
    distance: '1.4 km',
    rating: 4.8,
    open: true,
    hours: '24 hours',
    phone: '+961 1 555 201',
    stockMatch: 86,
    x: 67,
    y: 61
  },
  {
    id: 'ph-003',
    name: 'Saint George Pharmacy',
    area: 'Achrafieh, Beirut',
    address: 'Sassine Square, Beirut',
    distance: '2.3 km',
    rating: 4.7,
    open: false,
    hours: '08:00 – 20:00',
    phone: '+961 1 555 832',
    stockMatch: 78,
    x: 76,
    y: 29
  },
  {
    id: 'ph-004',
    name: 'Wellness Point',
    area: 'Ras Beirut',
    address: 'Bliss Street, Beirut',
    distance: '1.1 km',
    rating: 4.6,
    open: true,
    hours: '07:30 – 22:30',
    phone: '+961 1 555 172',
    stockMatch: 81,
    x: 28,
    y: 31
  }
];

export const medications = [
  { id: 'med-01', name: 'Panadol Extra', generic: 'Paracetamol + Caffeine', strength: '500mg / 65mg', form: 'Tablet', sku: 'PAX-500-24', category: 'Pain relief', stock: 86, reorder: 25, expiry: '2027-05-18', batch: 'PA24071', supplier: 'GSK', cost: 2.6, price: 4.25, rx: false, status: 'Healthy' },
  { id: 'med-02', name: 'Augmentin', generic: 'Amoxicillin / Clavulanate', strength: '1g', form: 'Tablet', sku: 'AUG-1G-14', category: 'Antibiotic', stock: 14, reorder: 20, expiry: '2027-02-09', batch: 'AU25118', supplier: 'GSK', cost: 9.8, price: 13.5, rx: true, status: 'Low' },
  { id: 'med-03', name: 'Lipitor', generic: 'Atorvastatin', strength: '20mg', form: 'Tablet', sku: 'LIP-20-30', category: 'Cardiovascular', stock: 42, reorder: 18, expiry: '2028-01-22', batch: 'LI25096', supplier: 'Pfizer', cost: 11.1, price: 15.0, rx: true, status: 'Healthy' },
  { id: 'med-04', name: 'Ventolin', generic: 'Salbutamol', strength: '100mcg', form: 'Inhaler', sku: 'VEN-100-200', category: 'Respiratory', stock: 8, reorder: 15, expiry: '2027-03-02', batch: 'VE25204', supplier: 'GSK', cost: 6.2, price: 9.0, rx: true, status: 'Critical' },
  { id: 'med-05', name: 'Glucophage', generic: 'Metformin', strength: '850mg', form: 'Tablet', sku: 'GLU-850-30', category: 'Diabetes', stock: 64, reorder: 25, expiry: '2028-07-14', batch: 'GL26017', supplier: 'Merck', cost: 4.3, price: 6.5, rx: true, status: 'Healthy' },
  { id: 'med-06', name: 'Brufen', generic: 'Ibuprofen', strength: '400mg', form: 'Tablet', sku: 'BRU-400-30', category: 'Pain relief', stock: 27, reorder: 20, expiry: '2027-09-06', batch: 'BR25112', supplier: 'Abbott', cost: 3.1, price: 5.0, rx: false, status: 'Watch' }
];

export const reservations = [
  { id: 'R-1048', customer: 'Maya Khoury', medicine: 'Augmentin 1g', qty: 1, submitted: '12 min ago', prescription: true, status: 'Pending', phone: '+961 70 442 318' },
  { id: 'R-1047', customer: 'Karim Haddad', medicine: 'Lipitor 20mg', qty: 2, submitted: '28 min ago', prescription: true, status: 'Pending', phone: '+961 71 338 412' },
  { id: 'R-1046', customer: 'Nadine Saad', medicine: 'Panadol Extra', qty: 1, submitted: '1h ago', prescription: false, status: 'Accepted', phone: '+961 76 532 211' },
  { id: 'R-1045', customer: 'Rami Daher', medicine: 'Ventolin 100mcg', qty: 1, submitted: '2h ago', prescription: true, status: 'Collected', phone: '+961 03 018 420' },
  { id: 'R-1044', customer: 'Lina Nassar', medicine: 'Glucophage 850mg', qty: 3, submitted: 'Yesterday', prescription: true, status: 'Declined', phone: '+961 70 742 900' }
];

export const subscribedPharmacies = [
  { id: 'KT-00018', name: 'Cedar Care Pharmacy', owner: 'Dr. Samer K.', area: 'Hamra, Beirut', license: 'LB-PH-48317', plan: 'Professional', joined: 'Jun 14, 2026', medicines: 2842, status: 'Active' },
  { id: 'KT-00019', name: 'Blue Cross Pharmacy', owner: 'Dr. Rana M.', area: 'Verdun, Beirut', license: 'LB-PH-77104', plan: 'Professional', joined: 'Jun 21, 2026', medicines: 3197, status: 'Active' },
  { id: 'KT-00020', name: 'Wellness Point', owner: 'Dr. Jad H.', area: 'Ras Beirut', license: 'LB-PH-33701', plan: 'Starter', joined: 'Jul 02, 2026', medicines: 1560, status: 'Active' },
  { id: 'KT-00021', name: 'Greenline Pharmacy', owner: 'Dr. Tala R.', area: 'Jounieh', license: 'LB-PH-99120', plan: 'Professional', joined: 'Aug 19, 2026', medicines: 0, status: 'Verification' },
  { id: 'KT-00022', name: 'Nova Pharmacy', owner: 'Dr. Elias N.', area: 'Hazmieh', license: 'LB-PH-66421', plan: 'Starter', joined: 'Aug 24, 2026', medicines: 0, status: 'Verification' }
];
