import type { Founder } from '@/content/types';
import { initials } from '@/lib/initials';

// The founder: his photo, or his initials, in the amber ring of a person.
export function FounderPortrait({
  founder,
  className = 'size-20 text-3xl md:size-24 md:text-4xl',
}: {
  founder: Founder;
  className?: string;
}) {
  const { photo } = founder;
  if (photo) {
    return (
      <img
        src={photo.src}
        alt=""
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className={`monogram object-cover ${className}`}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`monogram ${className}`}>
      {initials(founder.name)}
    </span>
  );
}
