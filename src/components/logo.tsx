// The full brand lockup as an image, so it costs no JavaScript: the mark in its
// brand colours and an ink wordmark, or a white one under a dark forced-colours theme.
export function Logo() {
  return (
    <picture>
      <source
        media="(forced-colors: active) and (prefers-color-scheme: dark)"
        srcSet="/logo/lockup-white.svg"
      />
      <img
        src="/logo/lockup.svg"
        alt=""
        width={107}
        height={32}
        className="h-8 w-auto md:h-9"
      />
    </picture>
  );
}
