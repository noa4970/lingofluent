import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const KEEP_HOURS = 24;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const cutoff = new Date(Date.now() - KEEP_HOURS * 60 * 60 * 1000).toISOString();
    const result = await base44.asServiceRole.entities.PracticeRunLog.deleteMany({
      created_date: { $lt: cutoff },
    });

    return Response.json({ deleted: result?.deleted ?? 0, cutoff });
  } catch (error) {
    console.error('Practice log cleanup failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}