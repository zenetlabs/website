import { legalClauses as en } from '@/content/en/legal-clauses';
import { legalClauses as es } from '@/content/es/legal-clauses';
import type { LegalEntity, SpanishLegalClauses } from '@/content/types';

export function legalClausesFor(entity: LegalEntity): SpanishLegalClauses {
  return entity.kind === 'sole-trader' ? es : en;
}
