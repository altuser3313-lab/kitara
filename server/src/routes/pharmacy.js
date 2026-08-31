import { asyncRouter } from '../async-router.js';
import { query, one } from '../db/index.js';
import { authenticate, requireRole } from '../auth.js';

const router = asyncRouter();
const guard = [authenticate, requireRole('pharmacy')];

function stockStatus(quantity, reorderLevel) {
  if (quantity === 0) return 'Out';
  if (quantity <= reorderLevel * 0.5) return 'Critical';
  if (quantity <= reorderLevel) return 'Low';
  if (quantity <= reorderLevel * 1.5) return 'Watch';
  return 'Healthy';
}

router.get('/pharmacy/inventory', guard, async (req, res) => {
  const rows = await query(
    `SELECT i.*, m.brand_name, m.generic_name, m.strength, m.dosage_form, m.category, m.prescription_required
       FROM pharmacy_inventory i JOIN medications m ON m.id = i.medication_id
      WHERE i.pharmacy_id = $1
      ORDER BY m.brand_name`,
    [req.pharmacyId]
  );

  const items = rows.map((r) => ({
    id: r.id,
    medicationId: r.medication_id,
    name: `${r.brand_name} - ${r.strength || ''}`.trim(),
    brandName: r.brand_name,
    genericName: r.generic_name,
    strength: r.strength,
    detail: [r.generic_name, r.dosage_form, r.prescription_required ? 'Prescription' : null].filter(Boolean).join(' / '),
    category: r.category,
    sku: r.sku,
    batch: r.batch_number,
    supplier: r.supplier,
    stock: r.quantity_on_hand,
    reorderAt: r.reorder_level,
    costPrice: r.cost_price ? Number(r.cost_price) : null,
    retailPrice: r.retail_price ? Number(r.retail_price) : null,
    expiry: r.expiry_date,
    status: stockStatus(r.quantity_on_hand, r.reorder_level),
    updatedAt: r.updated_at
  }));

  const totals = await one(
    `SELECT
        COALESCE(sum(quantity_on_hand), 0)::int AS units,
        count(*)::int AS lines,
        count(*) FILTER (WHERE quantity_on_hand > 0)::int AS in_stock,
        count(*) FILTER (WHERE quantity_on_hand <= reorder_level)::int AS low,
        COALESCE(sum(quantity_on_hand * cost_price), 0) AS value
       FROM pharmacy_inventory WHERE pharmacy_id = $1`,
    [req.pharmacyId]
  );
  const categories = await one(
    `SELECT count(DISTINCT m.category)::int AS n FROM pharmacy_inventory i
      JOIN medications m ON m.id = i.medication_id WHERE i.pharmacy_id = $1`,
    [req.pharmacyId]
  );

  res.json({
    items,
    summary: {
      records: totals.units,
      lines: totals.lines,
      categories: categories.n,
      inStockRate: totals.lines ? Number(((totals.in_stock / totals.lines) * 100).toFixed(1)) : 0,
      inStockLines: totals.in_stock,
      lowStock: totals.low,
      inventoryValue: Number(totals.value)
    }
  });
});

router.post('/pharmacy/inventory', guard, async (req, res) => {
  const { medicationId, sku, batch, supplier, stock = 0, reorderAt = 20, costPrice, retailPrice, expiry } = req.body || {};
  if (!medicationId) return res.status(400).json({ error: 'MEDICATION_REQUIRED' });

  const medication = await one('SELECT id FROM medications WHERE id = $1', [Number(medicationId)]);
  if (!medication) return res.status(404).json({ error: 'MEDICATION_NOT_FOUND' });

  const created = await one(
    `INSERT INTO pharmacy_inventory (pharmacy_id, medication_id, sku, batch_number, supplier, quantity_on_hand, reorder_level, cost_price, retail_price, expiry_date, last_stock_count_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, now())
     ON CONFLICT (pharmacy_id, medication_id, batch_number)
     DO UPDATE SET quantity_on_hand = pharmacy_inventory.quantity_on_hand + EXCLUDED.quantity_on_hand, updated_at = now()
     RETURNING *`,
    [req.pharmacyId, medication.id, sku || null, batch || null, supplier || null, Number(stock) || 0, Number(reorderAt) || 20, costPrice ?? null, retailPrice ?? null, expiry || null]
  );

  await query(
    `INSERT INTO inventory_movements (pharmacy_inventory_id, type, quantity, performed_by) VALUES ($1, 'receive', $2, $3)`,
    [created.id, Number(stock) || 0, req.user.id]
  );

  res.status(201).json({ id: created.id });
});

router.patch('/pharmacy/inventory/:id', guard, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one('SELECT * FROM pharmacy_inventory WHERE id = $1 AND pharmacy_id = $2', [id, req.pharmacyId]);
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });

  const { stock, reorderAt, retailPrice, costPrice, supplier, expiry } = req.body || {};
  const updated = await one(
    `UPDATE pharmacy_inventory SET
       quantity_on_hand = COALESCE($1, quantity_on_hand),
       reorder_level    = COALESCE($2, reorder_level),
       retail_price     = COALESCE($3, retail_price),
       cost_price       = COALESCE($4, cost_price),
       supplier         = COALESCE($5, supplier),
       expiry_date      = COALESCE($6::date, expiry_date),
       last_stock_count_at = now(),
       updated_at       = now()
     WHERE id = $7 AND pharmacy_id = $8 RETURNING *`,
    [stock ?? null, reorderAt ?? null, retailPrice ?? null, costPrice ?? null, supplier ?? null, expiry || null, id, req.pharmacyId]
  );

  if (stock != null && Number(stock) !== existing.quantity_on_hand) {
    await query(
      `INSERT INTO inventory_movements (pharmacy_inventory_id, type, quantity, performed_by) VALUES ($1, 'adjust', $2, $3)`,
      [id, Number(stock) - existing.quantity_on_hand, req.user.id]
    );
  }

  res.json({ id: updated.id, stock: updated.quantity_on_hand, status: stockStatus(updated.quantity_on_hand, updated.reorder_level) });
});

router.get('/pharmacy/reservations', guard, async (req, res) => {
  const rows = await query(
    `SELECT r.*, u.full_name, u.phone, p.file_name AS prescription_file
       FROM reservations r
       JOIN users u ON u.id = r.customer_user_id
       LEFT JOIN prescriptions p ON p.id = r.prescription_id
      WHERE r.pharmacy_id = $1
      ORDER BY r.created_at DESC`,
    [req.pharmacyId]
  );

  const today = await one(
    `SELECT count(*)::int AS received,
            count(*) FILTER (WHERE status IN ('accepted', 'ready', 'collected'))::int AS accepted,
            count(*) FILTER (WHERE responded_at IS NOT NULL)::int AS responded,
            COALESCE(avg(EXTRACT(EPOCH FROM (responded_at - created_at))) FILTER (WHERE responded_at IS NOT NULL), 0) AS avg_seconds
       FROM reservations WHERE pharmacy_id = $1`,
    [req.pharmacyId]
  );

  const avgSeconds = Math.round(Number(today.avg_seconds));
  res.json({
    reservations: rows.map((r) => ({
      id: r.reference,
      customer: r.full_name,
      phone: r.phone,
      medicine: r.requested_medication_text,
      quantity: r.quantity,
      status: r.status,
      note: r.customer_note,
      prescription: r.prescription_file,
      createdAt: r.created_at,
      respondedAt: r.responded_at
    })),
    summary: {
      received: today.received,
      accepted: today.accepted,
      avgResponse: avgSeconds ? `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s` : '—',
      fulfilmentRate: today.received ? Number(((today.accepted / today.received) * 100).toFixed(1)) : 0
    }
  });
});

const ALLOWED_TRANSITIONS = {
  pending: ['accepted', 'declined'],
  accepted: ['ready', 'collected', 'cancelled'],
  ready: ['collected', 'cancelled'],
  declined: [],
  collected: [],
  cancelled: [],
  expired: []
};

router.patch('/pharmacy/reservations/:reference/status', guard, async (req, res) => {
  const { status, note = null } = req.body || {};
  const reservation = await one(
    'SELECT * FROM reservations WHERE reference = $1 AND pharmacy_id = $2',
    [req.params.reference, req.pharmacyId]
  );
  if (!reservation) return res.status(404).json({ error: 'NOT_FOUND' });

  const allowed = ALLOWED_TRANSITIONS[reservation.status] || [];
  if (!allowed.includes(status)) {
    return res.status(409).json({ error: 'INVALID_TRANSITION', from: reservation.status, allowed });
  }

  const updated = await one(
    `UPDATE reservations SET status = $1::text, pharmacy_note = COALESCE($2, pharmacy_note),
            responded_at = COALESCE(responded_at, now()),
            collected_at = CASE WHEN $1::text = 'collected' THEN now() ELSE collected_at END
      WHERE id = $3 RETURNING *`,
    [status, note, reservation.id]
  );

  await query(
    `INSERT INTO reservation_events (reservation_id, actor_user_id, event_type, from_status, to_status, message)
     VALUES ($1, $2, 'status_change', $3, $4, $5)`,
    [reservation.id, req.user.id, reservation.status, status, note]
  );

  if (status === 'accepted' && reservation.medication_id) {
    const line = await one(
      'SELECT * FROM pharmacy_inventory WHERE pharmacy_id = $1 AND medication_id = $2 AND quantity_on_hand >= $3 ORDER BY expiry_date LIMIT 1',
      [req.pharmacyId, reservation.medication_id, reservation.quantity]
    );
    if (line) {
      await query('UPDATE pharmacy_inventory SET quantity_on_hand = quantity_on_hand - $1, updated_at = now() WHERE id = $2', [reservation.quantity, line.id]);
      await query(
        `INSERT INTO inventory_movements (pharmacy_inventory_id, type, quantity, reference_id, performed_by)
         VALUES ($1, 'reserve', $2, $3, $4)`,
        [line.id, -reservation.quantity, reservation.reference, req.user.id]
      );
    }
  }

  res.json({ id: updated.reference, status: updated.status });
});

router.get('/pharmacy/customer-history/:reference', guard, async (req, res) => {
  const reservation = await one(
    'SELECT customer_user_id FROM reservations WHERE reference = $1 AND pharmacy_id = $2',
    [req.params.reference, req.pharmacyId]
  );
  if (!reservation) return res.status(404).json({ error: 'NOT_FOUND' });

  const rows = await query(
    `SELECT r.reference, r.requested_medication_text, r.quantity, r.status, r.created_at
       FROM reservations r
      WHERE r.customer_user_id = $1 AND r.pharmacy_id = $2
      ORDER BY r.created_at DESC`,
    [reservation.customer_user_id, req.pharmacyId]
  );
  res.json(rows.map((r) => ({ id: r.reference, medicine: r.requested_medication_text, quantity: r.quantity, status: r.status, createdAt: r.created_at })));
});

const CATEGORY_BASE_RATE = {
  'Pain Relief': 3.2, Antibiotic: 1.8, Cardiovascular: 1.4, Diabetes: 1.6,
  'Anti-inflammatory': 1.5, 'Blood Pressure': 1.5, Gastrointestinal: 1.2, Antihistamine: 2.1
};

router.get('/pharmacy/forecasts', guard, async (req, res) => {
  const rows = await query(
    `SELECT i.id, i.quantity_on_hand, i.reorder_level, m.id AS medication_id, m.brand_name, m.strength, m.category,
            (SELECT COALESCE(sum(r.quantity), 0) FROM reservations r
              WHERE r.pharmacy_id = i.pharmacy_id AND r.medication_id = m.id
                AND r.status IN ('accepted', 'ready', 'collected')
                AND r.created_at > now() - interval '30 days')::int AS reserved_30d,
            (SELECT COALESCE(sum(abs(mv.quantity)), 0) FROM inventory_movements mv
              WHERE mv.pharmacy_inventory_id = i.id AND mv.type = 'dispense'
                AND mv.created_at > now() - interval '30 days')::int AS dispensed_30d
       FROM pharmacy_inventory i JOIN medications m ON m.id = i.medication_id
      WHERE i.pharmacy_id = $1`,
    [req.pharmacyId]
  );

  const forecasts = rows.map((r) => {
    const observed = r.reserved_30d + r.dispensed_30d;
    const basis = observed > 0 ? 'observed' : 'category-baseline';
    const dailyDemand = observed > 0 ? observed / 30 : (CATEGORY_BASE_RATE[r.category] ?? 1.5);
    const daysToStockout = dailyDemand > 0 ? Math.round(r.quantity_on_hand / dailyDemand) : 999;
    const recommended = Math.max(0, Math.ceil(dailyDemand * 30) - r.quantity_on_hand);
    const risk = daysToStockout <= 3 ? 'Critical' : daysToStockout <= 7 ? 'High' : daysToStockout <= 21 ? 'Medium' : 'Low';
    return {
      inventoryId: r.id,
      name: `${r.brand_name} ${r.strength || ''}`.trim(),
      category: r.category,
      currentStock: r.quantity_on_hand,
      dailyDemand: Number(dailyDemand.toFixed(2)),
      daysToStockout,
      demandChange: observed > 0 ? Number((((observed / 30) / (CATEGORY_BASE_RATE[r.category] ?? 1.5) - 1) * 100).toFixed(1)) : 0,
      recommendation: recommended > 0 ? `Order ${recommended} units` : 'Monitor',
      recommendedUnits: recommended,
      risk,
      basis
    };
  }).sort((a, b) => a.daysToStockout - b.daysToStockout);

  const atRisk = forecasts.filter((f) => f.daysToStockout <= 7);
  const observedLines = forecasts.filter((f) => f.basis === 'observed').length;

  res.json({
    forecasts,
    summary: {
      stockoutRisks: atRisk.length,
      criticalRisks: forecasts.filter((f) => f.risk === 'Critical').length,
      suggestedUnits: forecasts.reduce((sum, f) => sum + f.recommendedUnits, 0),
      suppliers: 5,
      confidence: forecasts.length ? Number(((observedLines / forecasts.length) * 100).toFixed(1)) : 0,
      observedLines,
      totalLines: forecasts.length,
      horizonDays: 7
    }
  });
});

router.get('/pharmacy/profile', guard, async (req, res) => {
  const p = await one('SELECT * FROM pharmacies WHERE id = $1', [req.pharmacyId]);
  const verification = await one(
    'SELECT status, reviewed_at FROM pharmacy_verifications WHERE pharmacy_id = $1 ORDER BY submitted_at DESC LIMIT 1',
    [req.pharmacyId]
  );
  res.json({
    id: p.id,
    name: p.name,
    licenseNumber: p.license_number,
    ownerName: p.owner_name,
    phone: p.phone,
    email: p.email,
    address: p.address,
    city: p.city,
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    openingHours: p.opening_hours,
    verificationStatus: p.verification_status,
    verifiedAt: verification?.reviewed_at ?? p.created_at,
    subscriptionPlan: p.subscription_plan,
    rating: Number(p.rating)
  });
});

router.patch('/pharmacy/profile', guard, async (req, res) => {
  const { name, licenseNumber, phone, email, address, city, latitude, longitude, openingHours } = req.body || {};
  const updated = await one(
    `UPDATE pharmacies SET
       name = COALESCE($1, name), license_number = COALESCE($2, license_number),
       phone = COALESCE($3, phone), email = COALESCE($4, email),
       address = COALESCE($5, address), city = COALESCE($6, city),
       latitude = COALESCE($7, latitude), longitude = COALESCE($8, longitude),
       opening_hours = COALESCE($9, opening_hours), updated_at = now()
     WHERE id = $10 RETURNING *`,
    [name, licenseNumber, phone, email, address, city, latitude ?? null, longitude ?? null, openingHours, req.pharmacyId]
  );
  res.json({ id: updated.id, name: updated.name, updatedAt: updated.updated_at });
});

export default router;
