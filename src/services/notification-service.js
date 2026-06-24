import db from '../db/adapter.js';

export async function listNotifications({ unreadOnly = false } = {}) {
  const conditions = unreadOnly ? [{ field: 'is_read', op: 'eq', value: 0 }] : null;
  return db.select('notifications', { conditions, orderBy: ['created_at', 'desc'], limit: 50 });
}

export async function createNotification({ type = 'info', message, link } = {}) {
  if (!message) throw new Error('Message is required');
  return db.create('notifications', { type, message, link: link || null, is_read: 0 });
}

export async function markAsRead(id) {
  return db.update('notifications', id, { is_read: 1 });
}

export async function markAllAsRead() {
  await db.exec('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
  return { ok: true };
}

export async function getUnreadCount() {
  const row = await db.row('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
  return row?.count || 0;
}

export async function deleteNotification(id) {
  const existing = await db.get('notifications', id);
  if (!existing) return false;
  return db.delete('notifications', id);
}

export async function deleteOldNotifications(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const deleted = await db.exec(
    'DELETE FROM notifications WHERE created_at < ? AND is_read = 1',
    [cutoff]
  );
  return { deleted: true };
}
