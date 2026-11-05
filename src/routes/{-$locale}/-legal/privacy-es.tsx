// TODO(albert): counsel sign-off of the 2026-11-05 draft
import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity, SpanishLegalClauses } from '@/content/types';
import { describeEntity } from '@/lib/content';
import { legalClausesFor } from '@/lib/legal-clauses';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import {
  AssistantBasis,
  AssistantRetention,
  AssistantSection,
  AssistantTransfer,
  CalculatorUse,
  CloudflareProcessor,
  VoiceBasis,
  VoiceProcessor,
  VoiceRetention,
  VoiceSection,
  VoiceTransfer,
  WebMcpUse,
} from '@/routes/{-$locale}/-legal/privacy-extras-es';

const EMAIL = (
  <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
    {PUBLIC_EMAIL}
  </a>
);

export function PrivacyEs({
  title,
  entity,
}: {
  title: string;
  entity: PublishedEntity;
}) {
  const legalEs = legalClausesFor(entity);

  return (
    <LegalPage
      title={title}
      updated="Última actualización: 5 de noviembre de 2026"
    >
      <LegalSection title="Quién es el responsable de tus datos">
        <p>{describeEntity(legalEs.controller, entity, 'es')}</p>
        <p>
          {legalEs.dataProtectionOfficer} Para cualquier cuestión sobre
          privacidad o para ejercer tus derechos, escribe a {EMAIL}.
        </p>
        <p>
          Esta política cumple el deber de información del art. 13 del
          Reglamento (UE) 2016/679 (RGPD) y de la Ley Orgánica 3/2018, de
          Protección de Datos Personales y garantía de los derechos digitales
          (LOPDGDD).
        </p>
      </LegalSection>
      <Collection />
      <LegalSection title="Dónde los guardamos">
        <p>
          Guardamos cada consulta, y el registro de los correos que enviamos
          sobre ella, en una base de datos de Cloudflare ubicada en la Unión
          Europea. Solo puede acceder a ella el titular del sitio, con su cuenta
          de Cloudflare o desde un panel interno protegido con Cloudflare
          Access. Los correos sobre tu consulta se guardan además en nuestro
          buzón de Google Workspace.
        </p>
      </LegalSection>
      <AssistantSection />
      <VoiceSection />
      <Bases legalEs={legalEs} />
      <Recipients legalEs={legalEs} />
      <Retention legalEs={legalEs} />
      <Rights legalEs={legalEs} />
    </LegalPage>
  );
}

type Parts = { legalEs: SpanishLegalClauses };

function Collection() {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalSection title="Qué datos recogemos y para qué">
      <p>
        Del formulario de contacto recogemos lo que escribes en él: tu nombre,
        tu correo electrónico, tu empresa (opcional) y tu mensaje. Los usamos
        para leer y responder a tu consulta, y para atender tu petición antes de
        un posible acuerdo. También te enviamos un correo de acuse de recibo a
        la dirección que nos indicas. Los datos que el formulario marca como
        obligatorios son necesarios para responderte: sin ellos no podemos
        atender tu consulta.
      </p>
      <p>
        Con el formulario registramos también la página por la que llegaste a
        nuestra web, la página desde la que lo envías, el sitio web que te
        enlazó (el referente) y las etiquetas de campaña del enlace que
        seguiste, como utm_source o gclid. Lo usamos para saber qué canales nos
        traen consultas.{' '}
        {analytics ? (
          <>
            Salvo que aceptes la atribución, no guardamos nada en tu dispositivo
            para ello. Si la aceptas, tu navegador conserva durante un máximo de
            90 días la primera página a la que llegaste, el sitio que te enlazó
            y las etiquetas de campaña, que se envían con tu consulta.
          </>
        ) : (
          <>Para ello no guardamos nada en tu dispositivo.</>
        )}
      </p>
      <p>
        Si reservas una llamada, guardamos la reserva junto con tu consulta (la
        hora elegida, tu zona horaria, tu nombre, tu email, tu empresa y el
        tema), creamos un evento en nuestro calendario de Google Workspace con
        tu dirección de correo electrónico y Google te envía una invitación de
        calendario con un enlace de Google Meet. Tu nombre y el tema que
        escribes se quedan con nosotros; no se incluyen en la invitación.
      </p>
      <p>
        Al enviar el formulario marcas una casilla con la que confirmas que has
        leído esta política. Guardamos qué versión de la política era y cuándo
        la marcaste, para poder demostrar que te informamos.
      </p>
      <p>
        Cuando visitas el sitio, Cloudflare, que lo aloja, trata tu dirección IP
        y los metadatos técnicos de cada solicitud (como el navegador, la página
        pedida y la hora) para servir las páginas y proteger el sitio frente a
        ataques y abusos. Esto incluye la comprobación antibots de Turnstile, el
        límite de envíos por conexión de los formularios y los registros
        técnicos de nuestro servidor, que no incluyen el contenido de tus
        mensajes.
      </p>
      {analytics ? (
        <p>
          Si aceptas las cookies analíticas, usamos Google Analytics 4 para
          medir las visitas y las acciones en el sitio, como los clics en
          nuestros botones y las consultas enviadas, nunca lo que escribes en
          ellas. Sin tu consentimiento, Google Analytics no se carga. El tráfico
          general lo medimos siempre con Cloudflare Web Analytics, que no usa
          cookies ni crea perfiles de los visitantes.
        </p>
      ) : (
        <p>
          El sitio no usa cookies publicitarias ni analíticas ni píxeles de
          seguimiento. Medimos el tráfico con Cloudflare Web Analytics, que no
          usa cookies ni crea perfiles de los visitantes.
        </p>
      )}
      <CalculatorUse />
      <WebMcpUse />
      <p>
        Solo te escribimos para responder a tu consulta o sobre la llamada que
        reservas. No te enviaremos comunicaciones comerciales por correo
        electrónico sin tu consentimiento previo (art. 21 de la Ley 34/2002,
        LSSI).
      </p>
    </LegalSection>
  );
}

function Bases({ legalEs }: Parts) {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalSection title="Base jurídica">
      <p>Tratamos tus datos con estas bases jurídicas, una por finalidad:</p>
      <ul>
        <li>
          Responder a tu consulta, enviarte el acuse de recibo y gestionar la
          llamada que reservas: la aplicación de medidas precontractuales a
          petición tuya (art. 6.1.b del RGPD).
        </li>
        <li>
          Saber qué canales nos traen consultas, con los datos de referente y de
          campaña: nuestro interés legítimo (art. 6.1.f del RGPD). Se limitan a
          lo que el enlace y tu navegador ya envían.
        </li>
        <li>
          Mantener el sitio seguro y evitar abusos, con la dirección IP,
          Turnstile, los límites de envíos y los registros técnicos, y conocer
          el tráfico de forma agregada con Cloudflare Web Analytics: nuestro
          interés legítimo (art. 6.1.f del RGPD).
        </li>
        <li>
          Guardar la versión de la política que se te mostró y la fecha: el
          cumplimiento de nuestra obligación de poder demostrar que te
          informamos (arts. 5.2 y 6.1.c del RGPD).
        </li>
        <AssistantBasis />
        <VoiceBasis />
        {analytics ? (
          <li>
            Las cookies analíticas y el registro de atribución: tu
            consentimiento (art. 6.1.a del RGPD y art. 22.2 de la LSSI), que
            puedes retirar cuando quieras desde «Configuración de cookies», al
            pie de cada página, sin que ello afecte a la licitud del tratamiento
            anterior.
          </li>
        ) : null}
      </ul>
      <p>{legalEs.formAcknowledgement}</p>
      <p>
        Cuando el tratamiento se basa en nuestro interés legítimo, puedes
        oponerte a él en cualquier momento escribiéndonos.
      </p>
    </LegalSection>
  );
}

function Recipients({ legalEs }: Parts) {
  const analytics = __GA4_ID__ !== null;
  return (
    <>
      <LegalSection title="Quién recibe tus datos">
        <p>
          No vendemos tus datos ni los cedemos a terceros, salvo obligación
          legal (por ejemplo, a las autoridades o a los juzgados que los
          requieran). {legalEs.processors}
        </p>
        <ul>
          <CloudflareProcessor />
          <li>
            Resend (Resend, Inc., Estados Unidos), para entregarnos por correo
            el mensaje del formulario y enviarte el acuse de recibo.
          </li>
          <li>
            Google (Google Cloud EMEA Limited, Irlanda), para Google Workspace:
            el buzón que recibe tu mensaje y, cuando reservas una llamada,
            Google Workspace Calendar y Meet.
          </li>
          <VoiceProcessor />
          {analytics ? (
            <li>
              Google (Google Ireland Limited y Google LLC), para Google
              Analytics, solo si aceptas las cookies analíticas.
            </li>
          ) : null}
        </ul>
      </LegalSection>
      <LegalSection title="Transferencias internacionales">
        <p>
          Algunos de estos proveedores pueden tratar datos fuera del Espacio
          Económico Europeo, {legalEs.transferPlaces}. Esas transferencias se
          apoyan en las garantías del capítulo V del RGPD:
        </p>
        <ul>
          <li>
            Cloudflare, Inc. y Google LLC (a la que Google recurre como
            subencargado) están adheridos al Marco de Privacidad de Datos UE-EE.
            UU., objeto de la decisión de adecuación de la Comisión Europea de
            10 de julio de 2023, y sus contratos incluyen además las cláusulas
            contractuales tipo de la Comisión Europea (Decisión de Ejecución
            (UE) 2021/914).
          </li>
          <li>
            Resend, Inc. aplica las cláusulas contractuales tipo de la Comisión
            Europea incluidas en su acuerdo de tratamiento de datos.
          </li>
          <AssistantTransfer />
          <VoiceTransfer />
        </ul>
        <p>Puedes pedirnos una copia de estas garantías escribiéndonos.</p>
      </LegalSection>
    </>
  );
}

function Retention({ legalEs }: Parts) {
  const analytics = __GA4_ID__ !== null;
  return (
    <LegalSection title="Cuánto tiempo los conservamos">
      <ul>
        <li>
          Consultas y reservas, con sus datos de origen, el registro de tu
          consentimiento y el registro de los correos que enviamos: las borramos
          automáticamente de la base de datos del sitio 24 meses después de
          recibirlas.
        </li>
        <li>
          Intentos de reserva que no llegan a confirmarse: los borramos a los 30
          días.
        </li>
        <li>
          Eventos de las llamadas en nuestro calendario de Google Workspace: una
          vez al mes borramos a mano los que tienen más de 24 meses.
        </li>
        <li>
          Correos en nuestro buzón: una vez al mes borramos a mano las
          conversaciones cuyo último mensaje tiene más de 24 meses, salvo que se
          haya iniciado una relación profesional; en ese caso, las conservamos
          mientras dure la relación y, después, {legalEs.recordsRetention}.
        </li>
        <li>
          Copias de los correos que enviamos en Resend (contenido, datos de
          envío y eventos de entrega): 30 días.
        </li>
        <li>Registros técnicos del servidor: 7 días como máximo.</li>
        <AssistantRetention />
        <VoiceRetention />
        {analytics ? (
          <>
            <li>
              Tu elección sobre las cookies: 12 meses, en tu navegador. La
              primera página por la que llegaste, si aceptas la atribución: 90
              días, en tu navegador.
            </li>
            <li>
              Google Analytics conserva los datos de eventos durante 14 meses.
            </li>
          </>
        ) : null}
      </ul>
      <p>
        Pasados estos plazos, suprimimos los datos. Las copias de seguridad
        automáticas de la base de datos (Time Travel de Cloudflare D1) conservan
        los datos borrados hasta 30 días más; después se eliminan de forma
        definitiva.
      </p>
    </LegalSection>
  );
}

function Rights({ legalEs }: Parts) {
  return (
    <>
      <LegalSection title="Tus derechos">
        <p>
          Puedes ejercer en cualquier momento, y de forma gratuita, tus derechos
          de acceso, rectificación, supresión, limitación del tratamiento,
          oposición y portabilidad de tus datos (arts. 15 a 21 del RGPD y 13 a
          18 de la LOPDGDD). Escribe a {EMAIL} indicando qué derecho quieres
          ejercer, a ser posible desde la dirección de correo con la que nos
          contactaste. Si tenemos dudas razonables sobre tu identidad, podremos
          pedirte la información necesaria para confirmarla. Te responderemos en
          el plazo de un mes, prorrogable otros dos si la solicitud es compleja
          (art. 12.3 del RGPD).
        </p>
        <p>
          No tomamos decisiones basadas únicamente en un tratamiento
          automatizado que produzcan efectos jurídicos sobre ti o te afecten de
          forma significativa, ni elaboramos perfiles con ese fin (art. 22 del
          RGPD).
        </p>
        <p>
          Si consideras que no hemos atendido bien tus derechos, puedes reclamar
          ante una autoridad de control: {legalEs.authorities}
        </p>
      </LegalSection>
      <LegalSection title="Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas adecuadas al riesgo (art.
          32 del RGPD): el sitio solo funciona con conexiones cifradas (HTTPS),
          la base de datos solo es accesible para el titular, los formularios
          están protegidos frente a bots y abusos, y guardamos solo los datos
          que necesitamos y durante los plazos indicados.
        </p>
      </LegalSection>
      <LegalSection title="Menores de edad">
        <p>
          Nuestros servicios se dirigen a empresas y profesionales. No recogemos
          de forma consciente datos de menores de 14 años (art. 7 de la
          LOPDGDD); si eres menor de esa edad, no nos envíes datos personales a
          través de este sitio.
        </p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>
          Qué cookies y tecnologías similares usamos se explica en la{' '}
          <a href={pagePath('es', 'cookies')} className={TEXT_LINK}>
            política de cookies
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Cambios en esta política">
        <p>
          Si cambiamos esta política, publicaremos la nueva versión aquí y
          actualizaremos la fecha de arriba.
        </p>
      </LegalSection>
    </>
  );
}
