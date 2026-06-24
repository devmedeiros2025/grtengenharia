import { getSupabase } from '../db/supabase.js';

export async function activityLogRoutes(app) {
  app.get('/api/activity-logs', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Activity Logs'], summary: 'Histórico de atividades do sistema' },
  }, async (request) => {
    const supabase = getSupabase();
    const { user_id, entity_type, limit: limitParam } = request.query || {};
    const lim = Math.min(parseInt(limitParam) || 200, 500);

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(lim);

    if (user_id) query = query.eq('user_id', user_id);
    if (entity_type) query = query.eq('entity_type', entity_type);

    const { data: logs, error } = await query;
    if (error) throw error;
    return { logs: logs || [] };
  });
}
