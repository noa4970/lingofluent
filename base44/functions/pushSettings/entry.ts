import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ensureVapidKeys } from '../../shared/webpush.ts';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'get';

    if (action === 'get') {
      const keys = await ensureVapidKeys(base44);
      const { items } = await base44.entities.PushSubscription.filter(
        { created_by_id: user.id },
        { limit: 1, sort: '-updated_date' },
      );
      return Response.json({ publicKey: keys.publicKey, subscription: items[0] || null });
    }

    if (action === 'disable') {
      await base44.entities.PushSubscription.updateMany(
        { created_by_id: user.id },
        { $set: { enabled: false } },
      );
      return Response.json({ ok: true });
    }

    if (action === 'save') {
      const endpoint = String(body.endpoint || '').trim();
      const p256dh = String(body.p256dh || '').trim();
      const auth = String(body.auth || '').trim();
      const reminderTime = TIME_PATTERN.test(String(body.reminderTime || '')) ? body.reminderTime : '19:00';
      const timezone = String(body.timezone || 'UTC').slice(0, 64);

      if (!endpoint || !p256dh || !auth) {
        return Response.json({ error: 'endpoint, p256dh and auth are required' }, { status: 400 });
      }

      const patch = {
        endpoint,
        p256dh,
        auth,
        reminder_time: reminderTime,
        timezone,
        enabled: body.enabled !== false,
      };

      const { items } = await base44.entities.PushSubscription.filter(
        { created_by_id: user.id },
        { limit: 1, sort: '-updated_date' },
      );
      const saved = items[0]
        ? await base44.entities.PushSubscription.update(items[0].id, patch)
        : await base44.entities.PushSubscription.create(patch);

      return Response.json({ ok: true, subscription: saved });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}