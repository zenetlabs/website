export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 124 144"
      width={24}
      height={28}
      aria-hidden="true"
      className={className}
    >
      <path
        className="fill-brand-amber"
        d="M0 36v24l20.666 12L0 84v24l62.002 36v-24l-20.67-12 20.67-12V72L0 36Z"
      />
      <path
        className="fill-brand-blue"
        d="M62.002 72v24l20.666-12v48l20.666-12V72L124 60V36L62.002 72Z"
      />
      <path
        className="fill-brand-teal"
        d="m0 36 62.002 36 20.666-12L62 48h41.333L124 36 62.002 0l-20.67 12 20.67 12H20.666L0 36Z"
      />
    </svg>
  );
}
