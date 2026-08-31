import { asyncRouter } from '../async-router.js';
import { query } from '../db/index.js';
import { authenticate } from '../auth.js';
import { MEDICATION_MATCH, MEDICATION_RANK } from '../medication-match.js';

const router = asyncRouter();

router.get('/search', authenticate, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ query: q, medications: [], pharmacies: [] });

  const medications = await query(
    `SELECT m.id, m.brand_name, m.generic_name, m.strength, m.category, m.prescription_required,
            count(DISTINCT i.pharmacy_id) FILTER (WHERE i.quantity_on_hand > 0)::int AS pharmacy_count,
            COALESCE(sum(i.quantity_on_hand), 0)::int AS units,
            min(i.retail_price) FILTER (WHERE i.quantity_on_hand > 0) AS from_price
       FROM medications m
       LEFT JOIN pharmacy_inventory i ON i.medication_id = m.id
       LEFT JOIN pharmacies p ON p.id = i.pharmacy_id AND p.verification_status = 'verified'
      WHERE ${MEDICATION_MATCH}
      GROUP BY m.id
      ORDER BY ${MEDICATION_RANK}, pharmacy_count DESC, m.brand_name
      LIMIT 6`,
    [q]
  );

  let ownStock = new Map();
  if (req.user.role === 'pharmacy' && medications.length) {
    const rows = await query(
      `SELECT medication_id, SUM(quantity_on_hand)::int AS stock
         FROM pharmacy_inventory
        WHERE pharmacy_id = $1 AND medication_id = ANY($2::int[])
        GROUP BY medication_id`,
      [req.pharmacyId, medications.map((m) => m.id)]
    );
    ownStock = new Map(rows.map((r) => [r.medication_id, r.stock]));
  }

  const pharmacies = await query(
    `SELECT id, name, city, address, verification_status
       FROM pharmacies
      WHERE (name ILIKE '%' || $1::text || '%'
          OR city ILIKE '%' || $1::text || '%'
          OR address ILIKE '%' || $1::text || '%'
          OR katara_code ILIKE '%' || $1::text || '%')
        AND ($2::text = 'admin' OR verification_status = 'verified')
      ORDER BY name
      LIMIT 5`,
    [q, req.user.role]
  );

  res.json({
    query: q,
    medications: medications.map((m) => ({
      id: m.id,
      name: `${m.brand_name} ${m.strength || ''}`.trim(),
      brandName: m.brand_name,
      genericName: m.generic_name,
      category: m.category,
      prescriptionRequired: m.prescription_required,
      pharmacyCount: m.pharmacy_count,
      units: m.units,
      fromPrice: m.from_price === null ? null : Number(m.from_price),
      ...(req.user.role === 'pharmacy' ? { yourStock: ownStock.get(m.id) ?? 0 } : {})
    })),
    pharmacies: pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      address: p.address,
      status: p.verification_status
    }))
  });
});

export default router;
