import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ensureVapidKeys, sendWebPush } from '../../shared/webpush.ts';

// The workflow runs every 15 minutes; a reminder is due in the run that follows
// its chosen minute, so the window is a little wider than the gap.
const WINDOW_MINUTES = 20;

function localClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

const timeToMinutes = (value) => {
  const [hour, minute] = String(value || '19:00').split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
};

async function inBatches(list, size, worker) {
  for (let start = 0; start < list.length; start += size) {
    await Promise.allSettled(list.slice(start, start + size).map(worker));
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { items } = await base44.asServiceRole.entities.PushSubscription.filter(
      { enabled: true },
      { limit: 500 },
    );
    if (!items.length) return Response.json({ checked: 0, due: 0, sent: 0 });

    const now = new Date();
    const due = items.filter((subscription) => {
      try {
        const local = localClock(now, subscription.timezone || 'UTC');
        if (subscription.last_sent_date === local.date) return false;
        const gap = (local.minutes - timeToMinutes(subscription.reminder_time) + 1440) % 1440;
        return gap < WINDOW_MINUTES;
      } catch {
        return false;
      }
    });
    if (!due.length) return Response.json({ checked: items.length, due: 0, sent: 0 });

    const owners = [...new Set(due.map((subscription) => subscription.created_by_id).filter(Boolean))];
    const wordsByOwner = new Map();
    await inBatches(owners, 6, async (ownerId) => {
      const page = await base44.asServiceRole.entities.VocabWord.filter(
        { created_by_id: ownerId, status: { $in: ['to_learn', 'learning'] } },
        { limit: 200, sort: '-created_date' },
      );
      wordsByOwner.set(ownerId, page?.items || []);
    });

    const vapid = {
      ...(await ensureVapidKeys(base44)),
      subject: new URL(req.url).origin,
    };

    let sent = 0;

    await inBatches(due, 6, async (subscription) => {
      const pool = wordsByOwner.get(subscription.created_by_id) || [];
      const word = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      const payload = word
        ? {
            title: 'Your daily Italian word',
            body: `${word.italian}${word.hebrew ? ` — ${word.hebrew}` : ''}`,
            url: '/',
          }
        : {
            title: 'Time for a little Italian',
            body: 'Open LingoFluent for a two-minute review.',
            url: '/',
          };

      try {
        const result = await sendWebPush({
          subscription: {
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
          payload,
          vapid,
        });

        if (result.status === 404 || result.status === 410) {
          await base44.asServiceRole.entities.PushSubscription.delete(subscription.id);
          return;
        }
        if (result.ok) {
          sent += 1;
          const local = localClock(now, subscription.timezone || 'UTC');
          await base44.asServiceRole.entities.PushSubscription.update(subscription.id, {
            last_sent_date: local.date,
          });
        }
      } catch {
        // Left unstamped so the next run in the window retries it.
      }
    });

    return Response.json({ checked: items.length, due: due.length, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}