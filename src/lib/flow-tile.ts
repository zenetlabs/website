import type { FlowStep, FlowTile } from '@/content/types';

// The tile a flow step is drawn with: the tool it names, else its actor.
export function tileOf(step: FlowStep): FlowTile {
  if (step.actor === 'tool') return step.tool ?? 'app';
  return step.actor;
}
