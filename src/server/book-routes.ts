import { env } from 'cloudflare:workers';
import { cancelPage, postCancel } from '@/server/booking-cancel';
import { confirmViewResponse, postConfirm } from '@/server/booking-confirm';
import { bookingDeps } from '@/server/tool-deps';

function deps() {
  return {
    ...bookingDeps(),
    limiter: env.BOOK_LIMITER,
    now: () => Date.now(),
  };
}

export function getConfirmView(request: Request): Promise<Response> {
  return confirmViewResponse(request, env.DB, Date.now());
}

export function confirmPost(request: Request): Promise<Response> {
  return postConfirm(request, deps());
}

export function cancelGet(request: Request): Promise<Response> {
  return cancelPage(request, deps());
}

export function cancelPost(request: Request): Promise<Response> {
  return postCancel(request, deps());
}
