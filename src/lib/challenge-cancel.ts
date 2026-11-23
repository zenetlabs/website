// The visitor left while a challenge was running (a panel closed, a call
// ended): not a failed check, so nothing reports one.
export class ChallengeCancelled extends Error {
  constructor() {
    super('challenge cancelled');
    this.name = 'ChallengeCancelled';
  }
}

// However long Turnstile keeps asking (its checkbox refreshes after its own
// timeout), a waiting submit or message gives up after this.
export const CHALLENGE_WAIT_LIMIT_MS = 180_000;
