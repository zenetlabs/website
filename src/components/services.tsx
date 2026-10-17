import { Section } from '@/components/section';
import { EYEBROW } from '@/components/ui';
import { useMessages } from '@/lib/i18n';

export function Services() {
  const { services } = useMessages();

  return (
    <Section id="services" eyebrow={services.eyebrow} title={services.title}>
      <ul className="grid gap-6 lg:grid-cols-3">
        {Object.values(services.items).map((item) => (
          <li
            key={item.number}
            className="flex flex-col rounded-card border border-hairline bg-surface p-8"
          >
            <p className={EYEBROW}>{item.number}</p>
            <h3 className="mt-4 font-display text-3xl leading-tight">
              {item.title}
            </h3>
            <ul className="mt-6 grid gap-3 text-muted-fg">
              {Object.values(item.bullets).map((bullet) => (
                <li
                  key={bullet}
                  className="relative pl-5 before:absolute before:top-[0.7em] before:left-0 before:size-1.5 before:rounded-full before:bg-agent"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Section>
  );
}
