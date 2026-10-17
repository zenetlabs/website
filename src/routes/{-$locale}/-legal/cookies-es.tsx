import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import { PUBLIC_EMAIL } from '@/lib/site';

export function CookiesEs({ title }: { title: string }) {
  return (
    <LegalPage
      title={title}
      updated="Última actualización: 17 de octubre de 2026"
    >
      <LegalSection title="Qué cubre esta política">
        <p>
          Esta política explica cómo zenetlabs.com, operado por Zenet Technology
          Pte. Ltd. (UEN 202202371M), usa cookies y tecnologías similares.
        </p>
      </LegalSection>
      <LegalSection title="Cookies que usamos">
        <p>
          No usamos cookies analíticas ni publicitarias y no te seguimos entre
          sitios. Medimos el tráfico con Cloudflare Web Analytics, que funciona
          sin cookies.
        </p>
        <p>
          Cloudflare, que aloja el sitio, puede instalar cookies estrictamente
          necesarias por motivos de seguridad, como la protección frente a
          tráfico abusivo. Estas no requieren tu consentimiento.
        </p>
      </LegalSection>
      <LegalSection title="Formulario de contacto y Turnstile">
        <p>
          El formulario de contacto usa Cloudflare Turnstile para distinguir a
          las personas de los bots. Turnstile solo se carga cuando empiezas a
          rellenar el formulario, no al abrir una página.
        </p>
      </LegalSection>
      <LegalSection title="Gestionar las cookies">
        <p>
          Puedes bloquear o borrar las cookies en los ajustes de tu navegador.
          El sitio seguirá funcionando.
        </p>
        <p>
          ¿Dudas? Escribe a{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
