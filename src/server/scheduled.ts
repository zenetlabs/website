import { purgeChats } from '@/server/chat/store';
import { deadOwnerEmails, purgeExpired } from '@/server/lead-store';
import { deliverDue, outboxDeps } from '@/server/outbox';
import { errorName } from '@/server/responses';
import { purgeVoiceSessions } from '@/server/voice/store';

const PURGE_HOUR_UTC = 3;
const TICK_MINUTES = 10;
const SUMMARY_IDS = 20;

function isPurgeTick(now: number): boolean {
  const time = new Date(now);
  return (
    time.getUTCHours() === PURGE_HOUR_UTC && time.getUTCMinutes() < TICK_MINUTES
  );
}

export async function runScheduled(
  env: Cloudflare.Env,
  now: number,
): Promise<void> {
  try {
    await deliverDue(outboxDeps(env), now);
  } catch (error) {
    console.error('scheduled: delivery failed', { error: errorName(error) });
  }
  if (!isPurgeTick(now)) return;
  try {
    const purged = await purgeExpired(env.DB, now);
    const deadOwner = await deadOwnerEmails(env.DB, SUMMARY_IDS);
    const log = deadOwner.count > 0 ? console.error : console.log;
    log('scheduled: daily summary', { purged, deadOwner });
  } catch (error) {
    console.error('scheduled: daily summary failed', {
      error: errorName(error),
    });
  }
  // After the leads, so a transcript whose lead just expired goes in the same run.
  try {
    console.log('scheduled: chat purge', {
      purged: await purgeChats(env.DB, now),
    });
  } catch (error) {
    console.error('scheduled: chat purge failed', { error: errorName(error) });
  }
  try {
    console.log('scheduled: voice purge', {
      purged: await purgeVoiceSessions(env.DB, now),
    });
  } catch (error) {
    console.error('scheduled: voice purge failed', {
      error: errorName(error),
    });
  }
}
