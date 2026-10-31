import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerifactuPage } from '@/components/verifactu-page';
import { verifactuDates } from '@/content/es/verifactu';
import { formatMoney } from '@/lib/money';
import { HUB_ES, SPANISH } from '../../test/landing';
import { SERVICES } from '../../test/page-content';

const copy = SPANISH.verifactu;

function view() {
  return render(
    <VerifactuPage
      locale="es"
      copy={copy}
      hub={HUB_ES}
      services={SERVICES.es}
    />,
  );
}

describe('VerifactuPage', () => {
  it('has no visible breadcrumb', () => {
    view();
    expect(
      screen.queryByRole('navigation', {
        name: HUB_ES.labels.breadcrumb,
      }),
    ).toBeNull();
  });

  it('shows both deadlines from the shared dates in a table', () => {
    const { container } = view();
    const table = container.querySelector('#deadlines table');
    expect(table).toHaveAttribute('aria-labelledby', 'deadlines-title');
    expect(
      [...(table?.querySelectorAll('tbody td') ?? [])].map(
        (td) => td.textContent,
      ),
    ).toEqual([
      `antes del ${verifactuDates.companies}`,
      `antes del ${verifactuDates.others}`,
    ]);
  });

  it('shows the check date, the announcement, the exclusions and the disclaimer', () => {
    const { container } = view();
    expect(
      screen.getByText(`Fechas revisadas el ${verifactuDates.checkedOn}.`),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.deadlines.announced)).toBeInTheDocument();
    expect(screen.getByText(copy.disclaimer)).toBeInTheDocument();
    expect(container.querySelectorAll('#deadlines ul > li')).toHaveLength(
      copy.deadlines.exclusions.length,
    );
  });

  it('lists six requirements and four things we do, with the sanction in euros', () => {
    const { container } = view();
    expect(container.querySelectorAll('#requirements h3')).toHaveLength(6);
    expect(container.querySelectorAll('#what-we-do h3')).toHaveLength(4);
    expect(container.textContent).toContain(formatMoney('es', 50000));
  });

  it('never calls an adapted program certified or writes the starred name', () => {
    const { container } = view();
    expect(container.textContent).not.toMatch(/certificad/i);
    expect(container.textContent).not.toContain('*');
  });

  it('renders the five questions collapsed with their anchors', () => {
    const { container } = view();
    const details = [...container.querySelectorAll('details')];
    expect(details.map((item) => item.id)).toEqual(
      copy.faq.items.map((item) => `faq-${item.id}`),
    );
    expect(details).toHaveLength(5);
    expect(container.querySelectorAll('script, img')).toHaveLength(0);
  });
});
