// TODO(albert): owner legal review (both entity variants, and the Precios clause)
import { LegalPage, LegalSection } from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { describeEntity } from '@/lib/content';
import { legalClausesFor } from '@/lib/legal-clauses';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

export function LegalNoticeEs({
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
      updated="Última actualización: 31 de octubre de 2026"
    >
      <LegalSection title="Datos identificativos">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la
          sociedad de la información y de comercio electrónico (LSSI-CE), te
          informamos de los datos del titular de zenetlabs.com.
        </p>
        <p>{describeEntity(legalEs.holder, entity, 'es')}</p>
        <p>
          Puedes contactar con el titular en{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>{' '}
          o mediante el{' '}
          <a href={`${pagePath('es', 'home')}#contact`} className={TEXT_LINK}>
            formulario de contacto
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Objeto">
        <p>
          Este sitio web presenta los servicios de consultoría de IA de Zenet
          Labs (formación, implementación de agentes y automatizaciones,
          integraciones y desarrollo web y de aplicaciones a medida) y permite a
          los visitantes ponerse en contacto con el titular. En el sitio no se
          contratan servicios ni se realizan pagos.
        </p>
      </LegalSection>
      <LegalSection title="Precios">
        <p>
          Los precios que se muestran en este sitio web están expresados en
          euros y no incluyen el IVA ni otros impuestos indirectos aplicables.
          El precio del diagnóstico es cerrado; los demás importes son precios
          «desde» o rangos orientativos, y el precio definitivo de cada proyecto
          se fija en el presupuesto que se entrega tras el diagnóstico. En este
          sitio web no se contrata ni se paga ningún servicio.
        </p>
      </LegalSection>
      <LegalSection title="Condiciones de uso">
        <p>
          El acceso al sitio es gratuito. Te comprometes a usarlo de forma
          lícita: sin dañar el sitio ni sus sistemas, sin acceder sin
          autorización a áreas restringidas y sin hacer un uso abusivo del
          formulario de contacto.
        </p>
      </LegalSection>
      <LegalSection title="Propiedad intelectual e industrial">
        <p>
          Los contenidos, el diseño, el logotipo y el código de este sitio
          pertenecen al titular o a sus licenciantes. Las marcas de terceros que
          aparecen en él pertenecen a sus respectivos propietarios.
        </p>
      </LegalSection>
      <LegalSection title="Responsabilidad">
        <p>
          La información del sitio es de carácter general. No garantizamos su
          disponibilidad ni su exactitud en todo momento, y el titular no
          responde de los sitios web de terceros.
        </p>
      </LegalSection>
      <LegalSection title="Enlaces">
        <p>
          El sitio enlaza a productos que opera el titular y a sitios de
          terceros. El titular no se responsabiliza de los contenidos de esos
          enlaces.
        </p>
      </LegalSection>
      <LegalSection title="Protección de datos y cookies">
        <p>
          Consulta cómo tratamos tus datos en la{' '}
          <a href={pagePath('es', 'privacy')} className={TEXT_LINK}>
            política de privacidad
          </a>{' '}
          y qué cookies usamos en la{' '}
          <a href={pagePath('es', 'cookies')} className={TEXT_LINK}>
            política de cookies
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Legislación aplicable y jurisdicción">
        <p>{legalEs.governingLaw}</p>
      </LegalSection>
      <LegalSection title="Cambios">
        <p>
          Podemos actualizar este aviso legal. Publicaremos la nueva versión
          aquí y actualizaremos la fecha de arriba.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
