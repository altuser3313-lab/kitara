import express from 'express';
import cors from 'cors';
import { getDb } from './db/index.js';
import { isEmpty, resetDatabase, DEMO_PASSWORD } from './db/reset.js';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customer.js';
import pharmacyRoutes from './routes/pharmacy.js';
import adminRoutes from './routes/admin.js';
import searchRoutes from './routes/search.js';

const PORT = Number(process.env.PORT) || 4000;
const app = express();

app.use(cors());
app.use('/prescriptions/blob', express.raw({ type: '*/*', limit: '15mb' }));
app.use(express.json());

app.get('/health', async (_req, res) => {
  const db = await getDb();
  res.json({ status: 'ok', driver: db.kind });
});

app.use(authRoutes);
app.use(customerRoutes);
app.use(pharmacyRoutes);
app.use(adminRoutes);
app.use(searchRoutes);

app.use((req, res) => res.status(404).json({ error: 'NO_SUCH_ROUTE', path: req.path }));

app.use((error, _req, res, _next) => {
  console.error('[katara]', error);
  res.status(500).json({ error: 'INTERNAL_ERROR', detail: error.message });
});

const db = await getDb();
if (await isEmpty()) {
  console.log('> empty database, bootstrapping schema + seed');
  await resetDatabase({ quiet: true });
}

app.listen(PORT, () => {
  console.log(`> katara api on http://localhost:${PORT}`);
  console.log(`> database: ${db.kind}`);
  console.log(`> demo accounts: customer@katara.demo / pharmacy@katara.demo / admin@katara.demo  (password: ${DEMO_PASSWORD})`);
});
