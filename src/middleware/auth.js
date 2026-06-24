import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';
import { validateApiKey } from '../services/webhook-service.js';

/**
 * Codifica a JWT_SECRET como Uint8Array para uso com jose
 */
function getSecretKey() {
  return new TextEncoder().encode(config.jwtSecret);
}

/**
 * Gera um JWT padrão usando jose (HS256)
 * @param {object} payload - Dados do usuário (sub, name, email, role, company_id)
 * @returns {Promise<string>} Token JWT
 */
export async function signJwt(payload, expiresIn) {
  const secret = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expiresIn || config.jwtExpiresIn || '7d')
    .sign(secret);
}

/**
 * Verifica JWT usando jose
 * @param {string} token
 * @returns {Promise<object|null>} Payload decodificado ou null
 */
export async function verifyJwt(token) {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Cria middleware de verificação de role.
 * Uso: app.get('/rota', { preHandler: [app.requireAuth, requireRole('ceo')] }, handler)
 * API Keys (server-side) têm acesso irrestrito.
 */
export function requireRole(...allowedRoles) {
  return async (request, reply) => {
    // API Key ou admin bypass
    if (request.user?.type === 'api_key' || request.user?.role === 'ceo') return;
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Acesso restrito ao perfil necessário' });
    }
  };
}

/**
 * Middleware: exige JWT válido
 */
export async function requireAuth(request, reply) {
  // Tenta Bearer token (JWT)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyJwt(token);
    if (payload) {
      request.user = payload;
      return;
    }
  }

  // Tenta API Key
  const apiKey = request.headers['x-api-key'];
  if (apiKey) {
    const keyRow = validateApiKey(apiKey);
    if (keyRow) {
      request.user = { id: keyRow.id, name: keyRow.name, type: 'api_key' };
      return;
    }
  }

  reply.code(401).send({ error: 'Não autorizado. Forneça Bearer token ou x-api-key.' });
}
