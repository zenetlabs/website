// The time being booked, on `agent-soft`: the label read aloud, the time,
// and the format or zone under it (the chat's card and the WebMCP dialog;
// /book draws its own summary, with the label shown and announced, in its own
// chunk to keep this module out of the page's first JavaScript).
export function BookingWhen({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="booking-when">
      <span aria-hidden="true" className="icon icon-calendar" />
      <p>
        <span className="sr-only">{`${label}: `}</span>
        <span className="block font-semibold">{primary}</span>
        <span className="block text-ui-s text-fg-soft">{secondary}</span>
      </p>
    </div>
  );
}
