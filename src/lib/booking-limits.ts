// Shared by the server schema, the booking forms and the WebMCP proposal check; no zod, so the client can import it.
export const BOOKING_LIMITS = {
  name: 100,
  email: 254,
  company: 100,
  topicMin: 10,
  topicMax: 1000,
} as const;
