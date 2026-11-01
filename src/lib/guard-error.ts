// The reasons a public browser POST is turned away before any work is done.
export type GuardError =
  | 'origin'
  | 'unsupported'
  | 'rate'
  | 'too-large'
  | 'invalid'
  | 'captcha'
  | 'unavailable';
