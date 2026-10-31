import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { describeEntity } from '@/lib/content';
import { legalClausesFor } from '@/lib/legal-clauses';
import { PUBLIC_EMAIL } from '@/lib/site';

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
      updated="Última actualización: 30 de octubre de 2026"
    >
      <LegalSection title="Quién es el responsable de tus datos">
        <p>{describeEntity(legalEs.controller, entity, 'es')}</p>
        <p>
          Para cualquier duda sobre privacidad, escribe a{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Qué datos recogemos y para qué">
        <p>
          Del formulario de contacto recogemos lo que escribes en él: tu nombre,
          tu correo electrónico, tu empresa (opcional) y tu mensaje. Los usamos
          para leer y responder a tu consulta, y para atender tu petición antes
          de un posible acuerdo.
        </p>
        <p>
          Cloudflare también trata tu dirección IP y los metadatos de la
          solicitud para proteger el sitio, incluida la comprobación antibots de
          Turnstile, y en sus registros operativos.
        </p>
        <p>
          El sitio no usa cookies publicitarias ni analíticas ni píxeles de
          seguimiento. Medimos el tráfico con Cloudflare Web Analytics, que no
          usa cookies ni crea perfiles de los visitantes.
        </p>
      </LegalSection>
      <LegalSection title="Base jurídica">
        <ul>
          <li>{legalEs.consentBasis}</li>
          <li>
            La aplicación de medidas precontractuales a petición tuya (art.
            6.1.b del RGPD).
          </li>
        </ul>
        <p>
          Puedes retirar tu consentimiento en cualquier momento escribiéndonos.
        </p>
      </LegalSection>
      <LegalSection title="Quién recibe tus datos">
        <p>No vendemos tus datos. Usamos estos encargados del tratamiento:</p>
        <ul>
          <li>Resend, para entregar por correo el mensaje del formulario.</li>
          <li>
            Cloudflare, para alojar el sitio, proteger el formulario con
            Turnstile y medir el tráfico con Web Analytics sin cookies.
          </li>
          <li>Google Workspace, que aloja el buzón que recibe tu mensaje.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Transferencias internacionales">
        <p>
          Estos proveedores pueden tratar datos fuera de tu país,{' '}
          {legalEs.transferPlaces}. Cuando es necesario, las transferencias se
          apoyan en garantías adecuadas, como las cláusulas contractuales tipo
          de la Comisión Europea.
        </p>
      </LegalSection>
      <LegalSection title="Cuánto tiempo los conservamos">
        <p>
          Conservamos tu mensaje durante 24 meses desde nuestro último contacto,
          salvo que se inicie una relación profesional. En ese caso, lo
          conservamos mientras dure la relación y lo exijan nuestras
          obligaciones legales.
        </p>
      </LegalSection>
      <LegalSection title="Tus derechos">
        <p>
          Puedes pedirnos acceso, rectificación, supresión o limitación del uso
          de tus datos, oponerte a su uso y recibir una copia en un formato
          portable. Escribe a{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>{' '}
          y te responderemos lo antes posible.
        </p>
        <p>
          También puedes reclamar ante una autoridad de control:{' '}
          {legalEs.authorities}
        </p>
      </LegalSection>
      <LegalSection title="Cambios en esta política">
        <p>
          Si cambiamos esta política, publicaremos la nueva versión aquí y
          actualizaremos la fecha de arriba.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
