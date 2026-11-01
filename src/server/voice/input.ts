import type { z } from 'zod';
import { voiceBookingSchema } from '@/server/booking-schema';
import type { Tool } from '@/server/tools/types';

// What the server accepts from an agent for a tool: the registry's input, except
// that a booking also needs the visitor's confirmation. The agent's tool schema
// is built from this, so the two cannot drift.
export function voiceInput(tool: Tool): z.ZodType {
  return tool.name === 'book_meeting' ? voiceBookingSchema : tool.input;
}
