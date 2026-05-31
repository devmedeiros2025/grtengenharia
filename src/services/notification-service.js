import { getDb } from '../db/schema.js';

export function listNotifications({ unreadOnly = false } = {}) {
  const db = getDb();
  const where = unreadOnly ? 'WHERE is_read = 0' : '';
  return db.prepare(`SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT 50`).all();
}

export function createNotification({ type = 'info', message, link } = {}) {
  if (!message) throw new Error('Message is required');
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO notifications (type, message, link) VALUES (?, ?, ?)'
  ).run(type, message, link || null);
  return { id: result.lastInsertRowid, type, message, link, is_read: 0 };
}

export function markAsRead(id) {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
}

export function markAllAsRead() {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
  return { ok: true };
}

export function getUnreadCount() {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get();
  return row.count;
}
