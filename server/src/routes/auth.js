import { asyncRouter } from '../async-router.js';
import { one } from '../db/index.js';
import { authenticate, issueToken, verifyPassword } from '../auth.js';

const router = asyncRouter();

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'EMAIL_AND_PASSWORD_REQUIRED' });

  const user = await one('SELECT * FROM users WHERE lower(email) = lower($1)', [String(email).trim()]);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const pharmacy = user.role === 'pharmacy'
    ? await one(
        `SELECT p.id, p.name FROM pharmacy_staff s
         JOIN pharmacies p ON p.id = s.pharmacy_id
         WHERE s.user_id = $1 AND s.active = TRUE LIMIT 1`,
        [user.id]
      )
    : null;

  res.json({
    token: issueToken(user),
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      pharmacyId: pharmacy?.id ?? null,
      pharmacyName: pharmacy?.name ?? null
    }
  });
});

router.get('/auth/me', authenticate, async (req, res) => {
  const pharmacy = req.pharmacyId
    ? await one('SELECT id, name FROM pharmacies WHERE id = $1', [req.pharmacyId])
    : null;

  res.json({
    id: req.user.id,
    name: req.user.full_name,
    email: req.user.email,
    role: req.user.role,
    pharmacyId: pharmacy?.id ?? null,
    pharmacyName: pharmacy?.name ?? null
  });
});

export default router;
