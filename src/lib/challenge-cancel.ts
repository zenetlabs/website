// The visitor left while a challenge was running (a panel closed, a call
// ended): not a failed check, so nothing reports one.
export class ChallengeCancelled extends Error {
  constructor() {
    super('challenge cancelled');
    this.name = 'ChallengeCancelled';
  }
}
