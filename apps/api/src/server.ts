import 'dotenv/config';
import express from 'express';
import { authenticate } from './middleware/auth';
import { tenantIsolation } from './middleware/tenantIsolation';
import { requireWriteAccess, requireFlag } from './middleware/featureGate';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.router';
import { academicRouter } from './modules/academic/academic.router';
import { hostelRouter } from './modules/hostel/hostel.router';
import { financeRouter } from './modules/finance/finance.router';

const app = express();

app.use(express.json());

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'FlexiSchool API' }));

// Public routes
app.use('/auth', authRouter);

// All /api routes require a valid JWT + resolved tenant context
app.use('/api', authenticate, tenantIsolation, requireWriteAccess);
app.use('/api/academic', academicRouter);
app.use('/api/hostel', requireFlag('hostel'), hostelRouter);
app.use('/api/finance', requireFlag('finance'), financeRouter);

app.use((_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`FlexiSchool API → http://localhost:${PORT}`);
});

export default app;
