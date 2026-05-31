import { config } from '../config.js';
import { signJwt } from '../middleware/auth.js';

export async function authRoutes(app) {
  app.post('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body || {};

    if (username !== config.adminUser || password !== config.adminPass) {
      return reply.code(401).send({ error: 'Credenciais inválidas' });
    }

    const token = signJwt({ sub: 'admin', name: config.adminUser });
    return { token, user: { name: config.adminUser } };
  });

  app.get('/api/auth/me', {
    preHandler: [app.requireAuth],
  }, async (request) => {
    return { user: request.user };
  });
}
