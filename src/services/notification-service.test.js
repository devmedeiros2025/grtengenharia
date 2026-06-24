import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as notificationService from './notification-service.js';

describe('Notification Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create notification with valid data', async () => {
    const notif = await notificationService.createNotification({
      type: 'info',
      message: 'Teste de notificação',
      link: '/leads/1',
    });
    assert.ok(notif, 'Should be created');
    assert.ok(notif.id > 0);
    assert.equal(notif.message, 'Teste de notificação');
    assert.equal(notif.type, 'info');
    assert.equal(notif.link, '/leads/1');
    assert.equal(notif.is_read, 0);
  });

  it('should create notification with default type', async () => {
    const notif = await notificationService.createNotification({ message: 'Sem tipo' });
    assert.ok(notif);
    assert.equal(notif.type, 'info');
  });

  it('should throw when creating notification without message', async () => {
    await assert.rejects(
      () => notificationService.createNotification({}),
      /Message is required/
    );
  });

  it('should list notifications', async () => {
    await notificationService.createNotification({ message: 'Notif 1' });
    await notificationService.createNotification({ message: 'Notif 2' });
    const list = await notificationService.listNotifications();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 2);
  });

  it('should filter unread notifications', async () => {
    const notif = await notificationService.createNotification({ message: 'Filter test' });
    const unread = await notificationService.listNotifications({ unreadOnly: true });
    assert.ok(unread.some(n => n.id === notif.id));
  });

  it('should mark notification as read', async () => {
    const notif = await notificationService.createNotification({ message: 'Read test' });
    const updated = await notificationService.markAsRead(notif.id);
    assert.ok(updated);
    assert.equal(updated.is_read, 1);
  });

  it('should mark all notifications as read', async () => {
    await notificationService.createNotification({ message: 'All read 1' });
    await notificationService.createNotification({ message: 'All read 2' });
    const result = await notificationService.markAllAsRead();
    assert.ok(result.ok);
    const count = await notificationService.getUnreadCount();
    assert.equal(count, 0);
  });

  it('should get unread count', async () => {
    const count = await notificationService.getUnreadCount();
    assert.ok(typeof count === 'number');
    assert.ok(count >= 0);
  });

  it('should delete a notification', async () => {
    const notif = await notificationService.createNotification({ message: 'Delete test' });
    const deleted = await notificationService.deleteNotification(notif.id);
    assert.equal(deleted, true);
  });

  it('should return false when deleting non-existent notification', async () => {
    const deleted = await notificationService.deleteNotification(99999);
    assert.equal(deleted, false);
  });

  it('should delete old read notifications', async () => {
    await notificationService.createNotification({ message: 'Old test' });
    const result = await notificationService.deleteOldNotifications(0);
    assert.ok(result.deleted);
  });
});
