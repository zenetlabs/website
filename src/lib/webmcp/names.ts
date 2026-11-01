export const WEBMCP_TOOL_NAMES = [
  'get_faq',
  'get_pricing',
  'estimate_project',
  'check_availability',
  'book_meeting',
  'navigate',
] as const;
export type WebMcpToolName = (typeof WEBMCP_TOOL_NAMES)[number];
