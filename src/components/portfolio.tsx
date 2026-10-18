import { Section } from '@/components/section';
import { EYEBROW } from '@/components/ui';
import { useMessages } from '@/lib/i18n';
import { PORTFOLIO } from '@/lib/portfolio';

const PREVIOUS = [
  { key: 'splyt', name: 'Splyt' },
  { key: 'setoros', name: 'Setoros' },
] as const;

export function Portfolio() {
  const { work } = useMessages();

  return (
    <Section
      id="work"
      eyebrow={work.eyebrow}
      title={work.title}
      lead={work.lead}
    >
      <ul className="grid gap-6 md:grid-cols-2">
        {PORTFOLIO.map(({ key, name, href }, index) => (
          <li key={key} className={index === 0 ? 'md:col-span-2' : undefined}>
            <a
              href={href}
              className="group flex h-full flex-col gap-5 rounded-card border border-hairline bg-surface p-8 motion-safe:transition-colors motion-safe:duration-200 hover:border-fg"
            >
              <div className="flex items-start justify-between gap-4">
                <p className={EYEBROW}>{work.items[key].category}</p>
                <span
                  aria-hidden="true"
                  className="font-mono text-xl leading-none motion-safe:transition-transform motion-safe:duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                >
                  ↗
                </span>
              </div>
              <h3 className="font-display text-[28px] leading-tight">{name}</h3>
              <p className="max-w-xl text-muted-fg">
                {work.items[key].description}
              </p>
              <div className="mt-auto flex items-center gap-2 font-mono text-sm">
                <span aria-hidden="true" className="text-agent">
                  ●
                </span>
                {new URL(href).host}
              </div>
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-12 border-t border-hairline pt-8">
        <h3 className={EYEBROW}>{work.previous.label}</h3>
        <dl className="mt-5 grid gap-6 md:grid-cols-2">
          {PREVIOUS.map(({ key, name }) => (
            <div key={key}>
              <dt className="font-semibold text-fg">{name}</dt>
              <dd className="mt-1 max-w-xl text-muted-fg">
                {work.previous[key]}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
