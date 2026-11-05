// TODO(albert): counsel sign-off of the 2026-11-05 draft
import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { taxIdLabel } from '@/lib/content';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

const CLOUDFLARE = (
  <p>
    Cloudflare, que aloja el sitio, puede instalar cookies técnicas de
    seguridad, como <code>__cf_bm</code> (distingue el tráfico automatizado del
    humano; dura 30 minutos). Son estrictamente necesarias para proteger el
    sitio frente a tráfico abusivo y no requieren tu consentimiento (art. 22.2
    de la LSSI).
  </p>
);

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
      updated="Última actualización: 5 de noviembre de 2026"
    >
      <LegalSection title="Qué cubre esta política">
        <p>
          Esta política explica cómo las páginas en español de zenetlabs.com,
          operadas por {entity.legalName} ({taxIdLabel(entity)}), usan cookies y
          tecnologías similares, como el almacenamiento local del navegador, de
          acuerdo con el art. 22.2 de la Ley 34/2002, de servicios de la
          sociedad de la información y de comercio electrónico (LSSI). Una
          cookie es un pequeño archivo que un sitio web guarda en tu navegador;
          el almacenamiento local funciona de forma parecida, pero no se envía
          al servidor.
        </p>
      </LegalSection>
      {analytics ? (
        <>
          <LegalSection title="Estrictamente necesarias">
            <p>
              <code>zenet-consent</code> (almacenamiento local, propio,
              zenetlabs.com): guarda tu elección durante 12 meses para no
              preguntarte en cada página. No se envía a ningún servidor.
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
              de 13 meses. Son cookies de terceros: aunque se instalan en
              nuestro dominio, las gestiona Google. Google puede tratar estos
              datos en Estados Unidos, al amparo del Marco de Privacidad de
              Datos UE-EE. UU. Mantenemos desactivadas las funciones
              publicitarias de Google, así que no instalamos cookies
              publicitarias (como <code>_gcl_*</code>) ni compartimos datos con
              Google para publicidad.
            </p>
          </LegalSection>
          <LegalSection title="Atribución (solo si la aceptas)">
            <p>
              <code>zenet-first-touch</code> (almacenamiento local, propio,
              máximo 90 días) guarda la primera página a la que llegaste, el
              sitio que te enlazó y las etiquetas de campaña del enlace, como
              utm_source o gclid. Si nos envías una consulta, se envía con ella
              para saber qué canal te trajo. Se queda con nosotros y Google no
              lo recibe.
            </p>
          </LegalSection>
          <LegalSection title="Sin cookies">
            <p>
              Medimos el tráfico general con Cloudflare Web Analytics, que
              funciona sin cookies y se usa elijas lo que elijas.
            </p>
            <p>
              Usamos las cookies analíticas y el registro de atribución solo con
              tu consentimiento (art. 22.2 de la LSSI y art. 6.1.a del RGPD).
              Rechazarlas es tan fácil como aceptarlas, y el sitio funciona
              igual. No te seguimos entre sitios.
            </p>
          </LegalSection>
        </>
      ) : (
        <LegalSection title="Cookies que usamos">
          <p>
            No usamos cookies analíticas ni publicitarias y no te seguimos entre
            sitios. Medimos el tráfico con Cloudflare Web Analytics, que
            funciona sin cookies. Por eso no te mostramos un aviso de cookies.
          </p>
          {CLOUDFLARE}
        </LegalSection>
      )}
      <LegalSection title="Formularios y Turnstile">
        <p>
          Cloudflare Turnstile distingue a las personas de los bots en el
          formulario de contacto
          {__ASSISTANT__ ? ', en el asistente de la web' : null}
          {__VOICE__ ? ', al empezar una llamada de voz' : null} y, cuando la
          reserva de llamadas está disponible, en la página de reserva y en el
          cuadro de confirmación de reserva que abre un agente de IA de tu
          navegador (WebMCP). Solo se carga cuando empiezas a usar uno de ellos,
          no al abrir una página, y es necesario para prestar el servicio que
          pides.
        </p>
      </LegalSection>
      <LegalSection id="manage" title="Gestionar las cookies">
        {analytics ? (
          <p>
            Puedes cambiar o retirar tu elección cuando quieras desde
            «Configuración de cookies», al pie de cada página. Si la retiras,
            Google Analytics se detiene al instante y borramos sus cookies
            cuando tu navegador lo permite. También puedes bloquear o borrar las
            cookies en los ajustes de tu navegador; el sitio seguirá
            funcionando.
          </p>
        ) : (
          <p>
            Puedes bloquear o borrar las cookies en los ajustes de tu navegador.
            El sitio seguirá funcionando.
          </p>
        )}
        <p>
          Cómo tratamos tus datos personales se explica en la{' '}
          <a href={pagePath('es', 'privacy')} className={TEXT_LINK}>
            política de privacidad
          </a>
          . ¿Dudas? Escribe a{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Cambios en esta política">
        <p>
          Si cambiamos las cookies que usamos, actualizaremos esta política y la
          fecha de arriba y, si hace falta, te volveremos a pedir tu
          consentimiento.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
