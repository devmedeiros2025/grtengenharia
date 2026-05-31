import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { requireAuth } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { leadRoutes } from './routes/leads.js';
import { webhookRoutes } from './routes/webhooks.js';
import { inboundRoutes } from './routes/inbound.js';
import { companyRoutes } from './routes/companies.js';
import { dealRoutes } from './routes/deals.js';
import { taskRoutes } from './routes/tasks.js';
import { fileRoutes } from './routes/files.js';
import { exportRoutes } from './routes/export.js';
import { notificationRoutes } from './routes/notifications.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { equipmentRoutes } from './routes/equipment.js';
import { serviceOrderRoutes } from './routes/service-orders.js';
import { contractRoutes } from './routes/contracts.js';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { searchRoutes } from './routes/search.js';
import { calendarRoutes } from './routes/calendar.js';
import biRoutes from './routes/bi.js';
import invoiceRoutes from './routes/invoices.js';
import proposalRoutes from './routes/proposals.js';
import projectRoutes from './routes/projects.js';
import ticketRoutes from './routes/tickets.js';
import rentalRoutes from './routes/rental.js';
import campaignRoutes from './routes/campaigns.js';
import followupRoutes from './routes/followups.js';
import hunterRoutes from './routes/hunter.js';
import { dailyRoutineRoutes } from './routes/daily-routines.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildApp() {
  const app = Fastify({
    logger: false,
    bodyLimit: 1048576, // 1MB
  });

  // ── Plugins ──────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // ── Swagger ──────────────────────────────────────────────────────────────

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'GRT CRM API',
        description: 'API do CRM GRT Engenharia & Locações',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${config.port}` }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // ── Static Files ─────────────────────────────────────────────────────────

  const publicDir = join(__dirname, '..', 'public');
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    wildcard: false,
  });

  // ── Decorate ─────────────────────────────────────────────────────────────

  app.decorate('requireAuth', requireAuth);

  // ── Health ───────────────────────────────────────────────────────────────

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ── SPA fallback ─────────────────────────────────────────────────────────

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Rota não encontrada' });
    }
    return reply.sendFile('index.html');
  });

  // ── Routes ───────────────────────────────────────────────────────────────

  await app.register(authRoutes);
  await app.register(leadRoutes);
  await app.register(webhookRoutes);
  await app.register(inboundRoutes);
  await app.register(companyRoutes);
  await app.register(dealRoutes);
  await app.register(taskRoutes);
  await app.register(fileRoutes);
  await app.register(exportRoutes);
  await app.register(notificationRoutes);
  await app.register(dashboardRoutes);
  await app.register(equipmentRoutes);
  await app.register(serviceOrderRoutes);
  await app.register(contractRoutes);
  await app.register(searchRoutes);
  await app.register(calendarRoutes);
  await app.register(biRoutes);
  await app.register(invoiceRoutes);
  await app.register(proposalRoutes);
  await app.register(projectRoutes);
  await app.register(ticketRoutes);
  await app.register(rentalRoutes);
  await app.register(campaignRoutes);
  await app.register(followupRoutes);
  await app.register(hunterRoutes);
  await app.register(dailyRoutineRoutes);

  // ── Error handler ────────────────────────────────────────────────────────

  app.setErrorHandler((error, request, reply) => {
    logger.error(`[${request.method} ${request.url}] ${error.message}`);
    if (error.statusCode === 429) {
      return reply.code(429).send({ error: 'Muitas requisições. Tente novamente em instantes.' });
    }
    return reply.code(error.statusCode || 500).send({
      error: config.nodeEnv === 'production' ? 'Erro interno do servidor' : error.message,
    });
  });

  return app;
}

async function start() {
  // Banco gerenciado pelo Supabase
  logger.info('Supabase database ready');

  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info(`CRM Webhook Server rodando em http://localhost:${config.port}`);
    logger.info(`Login: POST /api/auth/login`);
    logger.info(`Inbound Webhook: POST /api/webhooks/inbound/:token`);
    logger.info(`API Leads: GET/POST/PATCH /api/leads`);
    logger.info(`Settings: GET/POST /api/settings/webhooks/*`);
    logger.info(`Health: GET /health`);
    logger.info(`Swagger: GET /docs`);
    logger.info(`Search: GET /api/search?q=`);
    logger.info(`Calendar: GET /api/calendar?month=&year=`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
