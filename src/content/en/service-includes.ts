import { diagnosticPlan } from '@/content/en/diagnostic-plan';
import type { ServiceId } from '@/content/types';

// What each ladder row includes: the pricing page and the service pages read it from here.
// TODO(albert): confirm every list
export const serviceIncludes = {
  diagnostic: diagnosticPlan,
  integration: [
    'Scope taken from the diagnostic',
    'Built on your accounts, so you own it',
    'Alerts and retries when something fails',
    'Documentation and handover to your team',
  ],
  agent: [
    'A test set built from your real cases',
    'Approval steps wherever an action has consequences',
    'Usage and cost limits',
    'Monitoring and a log of every action',
  ],
  web: [
    'Design and build around your processes',
    'Fast, accessible and search-friendly',
    'Connected to your tools from day one',
    'Hosting set up on your accounts',
  ],
  training: [
    'Workshops built on your own processes, not generic examples',
    'Mentoring: regular reviews of what the team builds',
    'A usage policy your team can follow',
  ],
  maintenance: [
    'Monitoring and error alerts',
    'Fixes, and updates when your tools change',
    'A monthly review of what to improve',
  ],
  growth: [
    'Technical SEO and a content plan',
    'Pages and articles that answer real customer questions',
    'Conversion fixes based on what visitors do',
  ],
} satisfies Record<ServiceId, readonly string[]>;
