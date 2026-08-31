import { asyncRouter } from '../async-router.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { query, one } from '../db/index.js';
import { authenticate, requireRole } from '../auth.js';
import { dataDir } from '../db/index.js';
import { MEDICATION_MATCH, MEDICATION_RANK } from '../medication-match.js';

const router = asyncRouter();
const uploadsDir = path.join(dataDir, 'uploads');

const DEFAULT_ORIGIN = { lat: 33.8938, lng: 35.5018 };

function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function isOpenNow(hours) {
  if (!hours) return true;
  if (/24\s*\/\s*7/.test(hours)) return true;
  const match = hours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return true;
  const to24 = (h, m, mer) => {
    let hour = Number(h) % 12;
    if (/pm/i.test(mer)) hour += 12;
    return hour * 60 + Number(m);
  };
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= to24(match[1], match[2], match[3]) && minutes <= to24(match[4], match[5], match[6]);
}

router.get('/pharmacies', authenticate, async (req, res) => {
  const { medicine } = req.query;
  const origin = {
    lat: Number(req.query.lat) || DEFAULT_ORIGIN.lat,
    lng: Number(req.query.lng) || DEFAULT_ORIGIN.lng
  };

  const catalogSize = (await one('SELECT count(*)::int AS n FROM medications')).n;

  const rows = await query(
    `SELECT p.*,
            count(i.id) FILTER (WHERE i.quantity_on_hand > 0)::int AS lines_in_stock
       FROM pharmacies p
       LEFT JOIN pharmacy_inventory i ON i.pharmacy_id = p.id
      WHERE p.verification_status = 'verified'
      GROUP BY p.id
      ORDER BY p.name`
  );

  let matches = new Map();
  if (medicine) {
    const found = await query(
      `SELECT DISTINCT ON (i.pharmacy_id)
              i.pharmacy_id, i.quantity_on_hand, i.retail_price,
              m.id AS medication_id, m.brand_name, m.generic_name, m.strength, m.prescription_required
         FROM pharmacy_inventory i
         JOIN medications m ON m.id = i.medication_id
        WHERE i.quantity_on_hand > 0 AND ${MEDICATION_MATCH}
        ORDER BY i.pharmacy_id, ${MEDICATION_RANK}, i.quantity_on_hand DESC`,
      [String(medicine).trim()]
    );
    matches = new Map(found.map((r) => [r.pharmacy_id, r]));
  }

  const pharmacies = rows
    .filter((r) => (medicine ? matches.has(r.id) : true))
    .map((r) => {
      const distance = distanceKm(origin, { lat: Number(r.latitude), lng: Number(r.longitude) });
      const match = matches.get(r.id) || null;
      return {
        id: r.id,
        code: r.katara_code,
        name: r.name,
        address: r.address,
        area: r.city,
        phone: r.phone,
        email: r.email,
        hours: r.opening_hours,
        rating: Number(r.rating),
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        open: isOpenNow(r.opening_hours),
        distance: `${distance.toFixed(1)} km`,
        distanceKm: Number(distance.toFixed(2)),
        stockMatch: catalogSize ? Math.round((r.lines_in_stock / catalogSize) * 100) : 0,
        linesInStock: r.lines_in_stock,
        matched: match && {
          medicationId: match.medication_id,
          name: `${match.brand_name} ${match.strength || ''}`.trim(),
          genericName: match.generic_name,
          quantity: match.quantity_on_hand,
          price: Number(match.retail_price),
          prescriptionRequired: match.prescription_required
        }
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ origin, pharmacies });
});

router.get('/pharmacies/:id', authenticate, async (req, res) => {
  const pharmacy = await one('SELECT * FROM pharmacies WHERE id = $1', [Number(req.params.id)]);
  if (!pharmacy) return res.status(404).json({ error: 'NOT_FOUND' });

  const stock = await query(
    `SELECT m.brand_name, m.generic_name, m.strength, m.category, i.quantity_on_hand, i.retail_price
       FROM pharmacy_inventory i JOIN medications m ON m.id = i.medication_id
      WHERE i.pharmacy_id = $1 AND i.quantity_on_hand > 0
      ORDER BY m.brand_name`,
    [pharmacy.id]
  );

  res.json({
    id: pharmacy.id,
    name: pharmacy.name,
    address: pharmacy.address,
    area: pharmacy.city,
    phone: pharmacy.phone,
    email: pharmacy.email,
    hours: pharmacy.opening_hours,
    rating: Number(pharmacy.rating),
    open: isOpenNow(pharmacy.opening_hours),
    stock: stock.map((s) => ({
      name: `${s.brand_name} ${s.strength || ''}`.trim(),
      genericName: s.generic_name,
      category: s.category,
      quantity: s.quantity_on_hand,
      price: Number(s.retail_price)
    }))
  });
});

router.get('/medications', authenticate, async (_req, res) => {
  const rows = await query('SELECT * FROM medications ORDER BY brand_name');
  res.json(rows.map((m) => ({
    id: m.id,
    name: `${m.brand_name} ${m.strength || ''}`.trim(),
    brandName: m.brand_name,
    genericName: m.generic_name,
    strength: m.strength,
    category: m.category,
    prescriptionRequired: m.prescription_required
  })));
});

router.post('/reservations', authenticate, requireRole('customer'), async (req, res) => {
  const { pharmacyId, medicine, quantity = 1, note = null, prescriptionId = null } = req.body || {};
  if (!pharmacyId || !medicine) return res.status(400).json({ error: 'PHARMACY_AND_MEDICINE_REQUIRED' });

  const pharmacy = await one('SELECT id FROM pharmacies WHERE id = $1', [Number(pharmacyId)]);
  if (!pharmacy) return res.status(404).json({ error: 'PHARMACY_NOT_FOUND' });

  const medication = await one(
    `SELECT m.id FROM medications m WHERE ${MEDICATION_MATCH} ORDER BY ${MEDICATION_RANK} LIMIT 1`,
    [String(medicine).trim()]
  );

  const next = await one("SELECT COALESCE(max(id), 0) + 3889 AS n FROM reservations");
  const reference = `R-${next.n}`;

  const created = await one(
    `INSERT INTO reservations (reference, customer_user_id, pharmacy_id, medication_id, requested_medication_text, quantity, prescription_id, customer_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [reference, req.user.id, pharmacy.id, medication?.id ?? null, medicine, Number(quantity) || 1, prescriptionId, note]
  );

  await query(
    `INSERT INTO reservation_events (reservation_id, actor_user_id, event_type, from_status, to_status, message)
     VALUES ($1, $2, 'created', NULL, 'pending', $3)`,
    [created.id, req.user.id, 'Reservation request submitted.']
  );

  res.status(201).json({ id: created.reference, status: created.status, medicine, quantity: created.quantity });
});

router.get('/me/reservations', authenticate, requireRole('customer'), async (req, res) => {
  const rows = await query(
    `SELECT r.*, p.name AS pharmacy_name, p.city
       FROM reservations r JOIN pharmacies p ON p.id = r.pharmacy_id
      WHERE r.customer_user_id = $1
      ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  res.json(rows.map((r) => ({
    id: r.reference,
    pharmacy: r.pharmacy_name,
    city: r.city,
    medicine: r.requested_medication_text,
    quantity: r.quantity,
    status: r.status,
    createdAt: r.created_at
  })));
});

router.get('/me/profile', authenticate, requireRole('customer'), async (req, res) => {
  const user = await one('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const history = await query(
    `SELECT DISTINCT ON (m.id) m.brand_name, m.strength, m.generic_name, r.status, r.created_at
       FROM reservations r JOIN medications m ON m.id = r.medication_id
      WHERE r.customer_user_id = $1
      ORDER BY m.id, r.created_at DESC`,
    [req.user.id]
  );
  const prescriptions = await one(
    'SELECT count(*)::int AS n FROM prescriptions WHERE customer_user_id = $1', [req.user.id]
  );

  res.json({
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    dateOfBirth: user.date_of_birth,
    allergiesNote: user.allergies_note,
    prescriptionCount: prescriptions.n,
    medicationHistory: history.map((h) => ({
      name: `${h.brand_name} ${h.strength || ''}`.trim(),
      genericName: h.generic_name,
      state: ['collected', 'accepted', 'ready'].includes(h.status) ? 'Current' : 'Past',
      since: h.created_at
    }))
  });
});

router.patch('/me/profile', authenticate, requireRole('customer'), async (req, res) => {
  const { fullName, email, phone, dateOfBirth, allergiesNote } = req.body || {};
  const updated = await one(
    `UPDATE users SET
       full_name = COALESCE($1, full_name),
       email = COALESCE($2, email),
       phone = COALESCE($3, phone),
       date_of_birth = COALESCE($4::date, date_of_birth),
       allergies_note = COALESCE($5, allergies_note),
       updated_at = now()
     WHERE id = $6 RETURNING *`,
    [fullName, email, phone, dateOfBirth || null, allergiesNote, req.user.id]
  );
  res.json({ fullName: updated.full_name, email: updated.email, phone: updated.phone, dateOfBirth: updated.date_of_birth, allergiesNote: updated.allergies_note });
});

router.post('/prescriptions/upload-url', authenticate, requireRole('customer'), async (req, res) => {
  const { fileName, contentType } = req.body || {};
  if (!fileName) return res.status(400).json({ error: 'FILE_NAME_REQUIRED' });
  const objectKey = `${req.user.id}/${crypto.randomUUID()}-${String(fileName).replace(/[^\w.-]/g, '_')}`;
  const base = `${req.protocol}://${req.get('host')}`;
  res.json({ objectKey, contentType: contentType || 'application/octet-stream', uploadUrl: `${base}/prescriptions/blob/${encodeURIComponent(objectKey)}` });
});

router.put('/prescriptions/blob/:key', authenticate, requireRole('customer'), async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  if (!key.startsWith(`${req.user.id}/`) || key.includes('..')) {
    return res.status(403).json({ error: 'FORBIDDEN_KEY' });
  }
  const target = path.join(uploadsDir, key);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, req.body);
  res.status(204).end();
});

router.post('/prescriptions', authenticate, requireRole('customer'), async (req, res) => {
  const { objectKey, fileName, contentType, physicianName = null, issueDate = null } = req.body || {};
  if (!objectKey) return res.status(400).json({ error: 'OBJECT_KEY_REQUIRED' });
  if (!objectKey.startsWith(`${req.user.id}/`)) return res.status(403).json({ error: 'FORBIDDEN_KEY' });

  const created = await one(
    `INSERT INTO prescriptions (customer_user_id, file_name, storage_key, content_type, physician_name, issue_date, verification_status)
     VALUES ($1, $2, $3, $4, $5, $6::date, 'pending') RETURNING *`,
    [req.user.id, fileName || objectKey.split('/').pop(), objectKey, contentType, physicianName, issueDate]
  );
  res.status(201).json({ id: created.id, fileName: created.file_name, status: created.verification_status });
});

router.get('/prescriptions', authenticate, requireRole('customer'), async (req, res) => {
  const rows = await query(
    'SELECT * FROM prescriptions WHERE customer_user_id = $1 ORDER BY created_at DESC', [req.user.id]
  );
  res.json(rows.map((p) => ({
    id: p.id,
    fileName: p.file_name,
    physician: p.physician_name,
    status: p.verification_status,
    contentType: p.content_type,
    uploadedAt: p.created_at
  })));
});

router.post('/ai/substitutes', authenticate, async (req, res) => {
  const { medicine } = req.body || {};
  if (!medicine) return res.status(400).json({ error: 'MEDICINE_REQUIRED' });

  const target = await one(
    `SELECT m.* FROM medications m WHERE ${MEDICATION_MATCH} ORDER BY ${MEDICATION_RANK}, length(m.brand_name) DESC LIMIT 1`,
    [String(medicine).trim()]
  );

  if (!target) {
    return res.json({
      message: `No catalog entry matches "${medicine}". Katara only suggests alternatives for medicines it can verify against real pharmacy stock, so there is nothing to rank here. Ask a pharmacist to confirm the exact product name.`,
      options: []
    });
  }

  const candidates = await query(
    `SELECT m.*,
            count(i.id) FILTER (WHERE i.quantity_on_hand > 0)::int AS stocking_pharmacies,
            COALESCE(sum(i.quantity_on_hand), 0)::int AS total_units,
            min(i.retail_price) AS from_price
       FROM medications m
       LEFT JOIN pharmacy_inventory i ON i.medication_id = m.id
      WHERE m.id <> $1 AND (m.generic_name = $2 OR m.category = $3)
      GROUP BY m.id
      ORDER BY (m.generic_name = $2) DESC, stocking_pharmacies DESC`,
    [target.id, target.generic_name, target.category]
  );

  const options = candidates.map((c) => ({
    name: `${c.brand_name} ${c.strength || ''}`.trim(),
    match: c.generic_name === target.generic_name ? 'Same active ingredient' : `Same therapeutic class (${c.category})`,
    availability: c.stocking_pharmacies >= 4 ? 'High' : c.stocking_pharmacies >= 2 ? 'Medium' : 'Low',
    stockingPharmacies: c.stocking_pharmacies,
    totalUnits: c.total_units,
    fromPrice: c.from_price ? Number(c.from_price) : null,
    prescriptionRequired: c.prescription_required
  }));

  const rxNote = target.prescription_required
    ? ' This medicine requires a prescription, and so do same-class alternatives.'
    : '';

  res.json({
    target: { name: `${target.brand_name} ${target.strength || ''}`.trim(), genericName: target.generic_name, category: target.category },
    message: options.length
      ? `${target.brand_name} contains ${target.generic_name}. Ranked against live pharmacy stock, ${options.length} alternative${options.length === 1 ? '' : 's'} could be considered.${rxNote} A pharmacist makes the final decision.`
      : `${target.brand_name} contains ${target.generic_name}. No alternative in the current catalog shares that ingredient or class, so there is nothing safe to suggest automatically.${rxNote}`,
    options
  });
});

export default router;
