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
import rentalRoutes from './routes/rental.js';
import campaignRoutes from './routes/campaigns.js';
import hunterRoutes from './routes/hunter.js';
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
        description: 'API do CRM GRT Engenharia & Locações\n\nGerenciamento de leads, clientes, equipamentos, ordens de serviço, contratos, BI Analytics e muito mais.',
        version: '1.0.0',
        contact: { name: 'GRT Engenharia', email: 'contato@grtengenharia.com.br' },
      },
      servers: [{ url: `http://localhost:${config.port}` }],
      tags: [
        { name: 'Auth', description: 'Autenticação' },
        { name: 'Leads', description: 'Gestão de leads' },
        { name: 'Companies', description: 'Empresas' },
        { name: 'Deals', description: 'Pipeline de negócios' },
        { name: 'Tasks', description: 'Tarefas' },
        { name: 'Equipment', description: 'Equipamentos e frota' },
        { name: 'Service Orders', description: 'Ordens de serviço' },
        { name: 'Contracts', description: 'Contratos' },
        { name: 'Calendar', description: 'Calendário' },
        { name: 'Search', description: 'Busca global' },
        { name: 'Webhooks', description: 'Webhooks in/outbound' },
        { name: 'BI', description: 'BI Analytics' },
        { name: 'Dashboard', description: 'Dashboard KPIs' },
        { name: 'Files', description: 'Upload/download de arquivos' },
        { name: 'Hunter', description: 'Hunter de leads' },
        { name: 'Proposals', description: 'Propostas comerciais' },
        { name: 'Projects', description: 'Obras e projetos' },
        { name: 'Invoices', description: 'Faturamento' },
        { name: 'Rental', description: 'Locação de equipamentos' },
        { name: 'Campaigns', description: 'Campanhas de marketing' },
        { name: 'Notifications', description: 'Notificações' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Token JWT obtido via POST /api/auth/login',
          },
        },
      },
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
  await app.register(rentalRoutes);
  await app.register(campaignRoutes);
  await app.register(hunterRoutes);

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
  const { hasSupabase } = await import('./db/supabase.js');

  if (hasSupabase()) {
    logger.info('Supabase database ready');
  } else {
    // Inicializa SQLite local como fallback
    const { getDb } = await import('./db/schema.js');
    getDb();
    logger.info('SQLite local database ready (Supabase não configurado)');
  }

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
