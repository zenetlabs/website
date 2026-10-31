import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { taxIdLabel } from '@/lib/content';
import { PUBLIC_EMAIL } from '@/lib/site';

const CLOUDFLARE = (
  <p>
    Cloudflare, que aloja el sitio, puede instalar cookies estrictamente
    necesarias por motivos de seguridad, como la protección frente a tráfico
    abusivo. Estas no requieren tu consentimiento.
  </p>
);

// TODO(albert): legal review (R7 GA4, consent, first-touch)
export function CookiesEs({
  title,
  entity,
}: {
  title: string;
  entity: PublishedEntity;
}) {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalPage
      title={title}
      updated="Última actualización: 17 de octubre de 2026"
    >
      <LegalSection title="Qué cubre esta política">
        <p>
          Esta política explica cómo zenetlabs.com, operado por{' '}
          {entity.legalName} ({taxIdLabel(entity)}), usa cookies y tecnologías
          similares.
        </p>
      </LegalSection>
      {analytics ? (
        <>
          <LegalSection title="Estrictamente necesarias">
            <p>
              <code>zenet-consent</code> (almacenamiento local, zenetlabs.com):
              guarda tu elección durante 12 meses para no preguntarte en cada
              página. No se envía a ningún servidor.
            </p>
            {CLOUDFLARE}
          </LegalSection>
          <LegalSection title="Analíticas (solo si las aceptas)">
            <p>
              Google Analytics 4, un servicio de Google, mide las visitas y lo
              que se hace en la web, como pulsar nuestros botones o enviar una
              consulta (nunca lo que escribes). Instala <code>_ga</code>{' '}
              (distingue navegadores) y <code>_ga_&lt;ID&gt;</code> (mantiene el
              estado de la sesión) en zenetlabs.com, cada una durante un máximo
              de 13 meses. Google puede tratar estos datos en Estados Unidos.
            </p>
          </LegalSection>
          <LegalSection title="Marketing (solo si las aceptas)">
            <p>
              <code>zenet-first-touch</code> (almacenamiento local, máximo 90
              días) guarda la primera página a la que llegaste, el sitio que te
              enlazó y las etiquetas de campaña del enlace, como utm_source o
              gclid. Si nos envías una consulta, se envía con ella para saber
              qué canal te trajo. Esta opción también indica a Google, mediante
              el modo de consentimiento, que puede usar los datos analíticos
              para medir publicidad; hoy no usamos etiquetas publicitarias.
            </p>
          </LegalSection>
          <LegalSection title="Sin cookies">
            <p>
              Medimos el tráfico general con Cloudflare Web Analytics, que
              funciona sin cookies y se usa elijas lo que elijas.
            </p>
            <p>
              Usamos cookies analíticas y de marketing solo con tu
              consentimiento (art. 22.2 de la LSSI y art. 6.1.a del RGPD). No te
              seguimos entre sitios.
            </p>
          </LegalSection>
        </>
      ) : (
        <LegalSection title="Cookies que usamos">
          <p>
            No usamos cookies analíticas ni publicitarias y no te seguimos entre
            sitios. Medimos el tráfico con Cloudflare Web Analytics, que
            funciona sin cookies.
          </p>
          {CLOUDFLARE}
        </LegalSection>
      )}
      <LegalSection title="Formulario de contacto y Turnstile">
        <p>
          El formulario de contacto usa Cloudflare Turnstile para distinguir a
          las personas de los bots. Turnstile solo se carga cuando empiezas a
          rellenar el formulario, no al abrir una página.
        </p>
      </LegalSection>
      <LegalSection id="manage" title="Gestionar las cookies">
        {analytics ? (
          <p>
            Puedes cambiar o retirar tu elección cuando quieras desde
            «Configuración de cookies», al pie de cada página. Si la retiras,
            Google Analytics deja de funcionar desde la página siguiente y
            borramos sus cookies cuando tu navegador lo permite. También puedes
            bloquear o borrar las cookies en los ajustes de tu navegador; el
            sitio seguirá funcionando.
          </p>
        ) : (
          <p>
            Puedes bloquear o borrar las cookies en los ajustes de tu navegador.
            El sitio seguirá funcionando.
          </p>
        )}
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
