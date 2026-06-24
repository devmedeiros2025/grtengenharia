import { config } from '../config.js';
import { signJwt, verifyJwt } from '../middleware/auth.js';
import { AuthError, ValidationError } from '../lib/errors.js';
import bcrypt from 'bcrypt';

let getUserDb;

async function findDbUser(email) {
  if (!getUserDb) {
    try {
      const { getDb } = await import('../db/schema.js');
      getUserDb = getDb;
    } catch {
      return null;
    }
  }
  try {
    const db = getUserDb();
    return db.prepare('SELECT id, email, name, password_hash, role, cargo FROM users WHERE email = ? AND active = 1').get(email) || null;
  } catch {
    return null;
  }
}

export async function authRoutes(app) {
  app.post('/api/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Autenticar usuário',
      description: 'Recebe email + password e retorna token JWT',
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } } },
          },
        },
      },
    },
  }, async (request) => {
    const { username, password } = request.body || {};

    // Tenta usuário da tabela `users` (email + bcrypt)
    const dbUser = await findDbUser(username);
    if (dbUser && bcrypt.compareSync(password, dbUser.password_hash)) {
      const token = await signJwt({
        sub: String(dbUser.id),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        cargo: dbUser.cargo || null,
      });
      const refreshToken = await signJwt({
        sub: String(dbUser.id),
        type: 'refresh',
      });
      return { token, refreshToken, user: { name: dbUser.name, email: dbUser.email, role: dbUser.role } };
    }

    throw new AuthError('Credenciais inválidas');
  });

  app.get('/api/auth/me', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Auth'], summary: 'Obter usuário logado', description: 'Retorna dados do usuário autenticado pelo token JWT' },
  }, async (request) => {
    return { user: request.user };
  });

  app.post('/api/auth/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Renovar token JWT',
      description: 'Recebe refresh token e retorna novo access token + novo refresh token',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      }
    },
  }, async (request) => {
    const { refreshToken } = request.body || {};
    if (!refreshToken) throw new ValidationError('Refresh token é obrigatório');

    const payload = await verifyJwt(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw new AuthError('Refresh token inválido ou expirado');
    }

    const { getDb } = await import('../db/schema.js');
    const db = getDb();
    const user = db.prepare('SELECT id, email, name, role, cargo FROM users WHERE id = ? AND active = 1').get(payload.sub) || null;
    if (!user) throw new AuthError('Usuário não encontrado ou inativo');

    const newToken = await signJwt({
      sub: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      cargo: user.cargo || null,
    });

    const newRefreshToken = await signJwt({
      sub: String(user.id),
      type: 'refresh',
    });

    return { token: newToken, refreshToken: newRefreshToken, user: { name: user.name, email: user.email, role: user.role } };
  });
}
