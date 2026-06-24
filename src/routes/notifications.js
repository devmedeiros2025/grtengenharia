import * as notificationService from '../services/notification-service.js';

export async function notificationRoutes(app) {
  // List notifications
  app.get('/api/notifications', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Notifications'], summary: 'Listar notificações', description: 'Retorna lista de notificações do usuário' },
  }, async (request) => {
    const unreadOnly = request.query.unread === 'true';
    return notificationService.listNotifications({ unreadOnly });
  });

  // Get unread count
  app.get('/api/notifications/unread-count', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Notifications'], summary: 'Contagem de não lidas', description: 'Retorna o número de notificações não lidas' },
  }, async () => {
    return { count: notificationService.getUnreadCount() };
  });

  // Mark as read
  app.patch('/api/notifications/:id/read', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Notifications'], summary: 'Marcar como lida', description: 'Marca uma notificação específica como lida' },
  }, async (request, reply) => {
    const notification = await notificationService.markAsRead(Number(request.params.id));
    if (!notification) return reply.code(404).send({ error: 'Notificação não encontrada' });
    return notification;
  });

  // Mark all as read
  app.post('/api/notifications/read-all', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Notifications'], summary: 'Marcar todas como lidas', description: 'Marca todas as notificações como lidas' },
  }, async () => {
    return notificationService.markAllAsRead();
  });
}
