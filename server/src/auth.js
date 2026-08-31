import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { one } from './db/index.js';

const SECRET = process.env.JWT_SECRET || 'katara-local-dev-secret';
const TTL = '12h';

export function issueToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      name: user.full_name,
      'cognito:groups': [user.role]
    },
    SECRET,
    { expiresIn: TTL }
  );
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, salt, expected] = stored.split('$');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'MISSING_TOKEN' });

  let claims;
  try {
    claims = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }

  const user = await one('SELECT id, role, full_name, email, phone FROM users WHERE id = $1', [Number(claims.sub)]);
  if (!user) return res.status(401).json({ error: 'UNKNOWN_USER' });

  req.user = user;

  if (user.role === 'pharmacy') {
    const staff = await one(
      'SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = $1 AND active = TRUE LIMIT 1',
      [user.id]
    );
    if (!staff) return res.status(403).json({ error: 'NO_PHARMACY_ASSIGNMENT' });
    req.pharmacyId = staff.pharmacy_id;
  }

  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN_ROLE' });
    next();
  };
}
