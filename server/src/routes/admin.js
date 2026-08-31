import { asyncRouter } from '../async-router.js';
import { query, one } from '../db/index.js';
import { authenticate, requireRole } from '../auth.js';

const router = asyncRouter();
const guard = [authenticate, requireRole('admin')];

router.get('/admin/dashboard', guard, async (_req, res) => {
  const totals = await one(`
    SELECT
      (SELECT count(*)::int FROM pharmacies) AS pharmacies,
      (SELECT count(*)::int FROM pharmacies WHERE verification_status = 'verified') AS verified,
      (SELECT count(*)::int FROM users WHERE role = 'customer') AS customers,
      (SELECT count(*)::int FROM reservations) AS reservations,
      (SELECT count(*) FILTER (WHERE status IN ('accepted','ready','collected'))::int FROM reservations) AS fulfilled,
      (SELECT COALESCE(sum(quantity_on_hand), 0)::int FROM pharmacy_inventory) AS inventory_units,
      (SELECT count(*)::int FROM pharmacy_verifications WHERE status = 'pending') AS pending_verifications
  `);

  const activity = await query(`
    SELECT to_char(d.day, 'Dy') AS label, d.day::date AS day,
           count(r.id)::int AS reservations
      FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') AS d(day)
      LEFT JOIN reservations r ON date_trunc('day', r.created_at) = d.day
     GROUP BY d.day ORDER BY d.day
  `);

  const recent = await query(
    `SELECT katara_code, name, city, verification_status, created_at FROM pharmacies ORDER BY id DESC LIMIT 5`
  );

  const lowStock = await one(
    `SELECT count(*)::int AS n FROM pharmacy_inventory WHERE quantity_on_hand <= reorder_level`
  );

  res.json({
    summary: {
      pharmacies: totals.pharmacies,
      verifiedPharmacies: totals.verified,
      customers: totals.customers,
      reservations: totals.reservations,
      fulfilmentRate: totals.reservations ? Number(((totals.fulfilled / totals.reservations) * 100).toFixed(1)) : 0,
      inventoryUnits: totals.inventory_units,
      pendingVerifications: totals.pending_verifications,
      lowStockLines: lowStock.n
    },
    activity: activity.map((a) => ({ label: a.label, day: a.day, reservations: a.reservations })),
    recentPharmacies: recent.map((r) => ({ code: r.katara_code, name: r.name, city: r.city, status: r.verification_status, joined: r.created_at }))
  });
});

router.get('/admin/pharmacies', guard, async (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : null;
  const medicine = req.query.medicine ? String(req.query.medicine).trim() : null;

  const rows = await query(
    `SELECT p.*,
            COALESCE(sum(i.quantity_on_hand), 0)::int AS medicine_records
       FROM pharmacies p
       LEFT JOIN pharmacy_inventory i ON i.pharmacy_id = p.id
      WHERE ($1::text IS NULL
         OR p.name ILIKE $1::text OR p.owner_name ILIKE $1::text
         OR p.city ILIKE $1::text OR p.license_number ILIKE $1::text)
        AND ($2::text IS NULL OR EXISTS (
              SELECT 1 FROM pharmacy_inventory pi JOIN medications m ON m.id = pi.medication_id
               WHERE pi.pharmacy_id = p.id AND pi.quantity_on_hand > 0
                 AND (m.brand_name ILIKE '%' || $2::text || '%' OR m.generic_name ILIKE '%' || $2::text || '%')
            ))
      GROUP BY p.id ORDER BY p.id`,
    [search, medicine]
  );

  res.json(rows.map((r) => ({
    id: r.id,
    code: r.katara_code,
    name: r.name,
    owner: r.owner_name,
    license: r.license_number,
    city: r.city,
    address: r.address,
    phone: r.phone,
    email: r.email,
    plan: r.subscription_plan,
    medicineRecords: r.medicine_records,
    status: r.verification_status,
    joined: r.created_at
  })));
});

router.get('/admin/verifications', guard, async (_req, res) => {
  const rows = await query(
    `SELECT v.*, p.name, p.city, p.address, p.owner_name, p.license_number
       FROM pharmacy_verifications v JOIN pharmacies p ON p.id = v.pharmacy_id
      ORDER BY (v.status = 'pending') DESC, v.submitted_at DESC`
  );
  const docs = await query('SELECT * FROM verification_documents ORDER BY id');

  res.json(rows.map((v) => ({
    id: v.id,
    reference: `V-${String(v.id).padStart(4, '0')}`,
    pharmacyId: v.pharmacy_id,
    pharmacy: v.name,
    city: v.city,
    address: v.address,
    owner: v.owner_name,
    license: v.license_number,
    status: v.status,
    submittedAt: v.submitted_at,
    reviewedAt: v.reviewed_at,
    reviewNotes: v.review_notes,
    documents: docs.filter((d) => d.verification_id === v.id).map((d) => ({ type: d.document_type, status: d.status }))
  })));
});

async function review(req, res, decision) {
  const id = Number(req.params.id);
  const verification = await one('SELECT * FROM pharmacy_verifications WHERE id = $1', [id]);
  if (!verification) return res.status(404).json({ error: 'NOT_FOUND' });
  if (verification.status !== 'pending') {
    return res.status(409).json({ error: 'ALREADY_REVIEWED', status: verification.status });
  }

  await query(
    `UPDATE pharmacy_verifications SET status = $1, reviewer_user_id = $2, review_notes = $3, reviewed_at = now() WHERE id = $4`,
    [decision, req.user.id, req.body?.notes ?? null, id]
  );
  await query(
    'UPDATE pharmacies SET verification_status = $1, updated_at = now() WHERE id = $2',
    [decision === 'approved' ? 'verified' : 'rejected', verification.pharmacy_id]
  );

  res.json({ id, status: decision });
}

router.post('/admin/verifications/:id/approve', guard, (req, res) => review(req, res, 'approved'));
router.post('/admin/verifications/:id/reject', guard, (req, res) => review(req, res, 'rejected'));

export default router;
