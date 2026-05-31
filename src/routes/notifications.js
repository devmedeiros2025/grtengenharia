import * as notificationService from '../services/notification-service.js';

export async function notificationRoutes(app) {
  // List notifications
  app.get('/api/notifications', {
    preHandler: [app.requireAuth],
  }, async (request) => {
    const unreadOnly = request.query.unread === 'true';
    return notificationService.listNotifications({ unreadOnly });
  });

  // Get unread count
  app.get('/api/notifications/unread-count', {
    preHandler: [app.requireAuth],
  }, async () => {
    return { count: notificationService.getUnreadCount() };
  });

  // Mark as read
  app.patch('/api/notifications/:id/read', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const notification = notificationService.markAsRead(Number(request.params.id));
    if (!notification) return reply.code(404).send({ error: 'Notificação não encontrada' });
    return notification;
  });

  // Mark all as read
  app.post('/api/notifications/read-all', {
    preHandler: [app.requireAuth],
  }, async () => {
    return notificationService.markAllAsRead();
  });
}
