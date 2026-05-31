import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { validateApiKey } from '../services/webhook-service.js';

/**
 * Gera JWT simples (sem lib externa)
 */
function signJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 7 })).toString('base64url');
  const sig = createHmac('sha256', config.jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = createHmac('sha256', config.jwtSecret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(parts[2]))) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export { signJwt, verifyJwt };

/**
 * Middleware: exige JWT válido
 */
export async function requireAuth(request, reply) {
  // Tenta Bearer token (JWT)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyJwt(token);
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
