// TODO(albert): counsel sign-off of the 2026-11-05 draft
import {
  LegalPage,
  LegalSection,
  type LegalSectionRef,
} from '@/components/legal-page';
import { TEXT_LINK } from '@/components/ui';
import type { PublishedEntity } from '@/content/types';
import { describeEntity } from '@/lib/content';
import { legalClausesFor } from '@/lib/legal-clauses';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

const SECTIONS = {
  identity: { id: 'datos-identificativos', title: 'Datos identificativos' },
  object: { id: 'objeto', title: 'Objeto' },
  prices: { id: 'precios', title: 'Precios' },
  terms: { id: 'condiciones-de-uso', title: 'Condiciones de uso' },
  ip: {
    id: 'propiedad-intelectual',
    title: 'Propiedad intelectual e industrial',
  },
  liability: { id: 'responsabilidad', title: 'Responsabilidad' },
  links: { id: 'enlaces', title: 'Enlaces' },
  data: { id: 'proteccion-de-datos', title: 'Protección de datos y cookies' },
  law: {
    id: 'legislacion-aplicable',
    title: 'Legislación aplicable y jurisdicción',
  },
  changes: { id: 'cambios', title: 'Cambios' },
} as const satisfies Record<string, LegalSectionRef>;

export function LegalNoticeEs({
  title,
  entity,
}: {
  title: string;
  entity: PublishedEntity;
}) {
  const legalEs = legalClausesFor(entity);
  const contents = Object.values(SECTIONS);

  return (
    <LegalPage
      locale="es"
      contents={contents}
      title={title}
      updated="Última actualización: 5 de noviembre de 2026"
    >
      <LegalSection section={SECTIONS.identity}>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la
          sociedad de la información y de comercio electrónico (LSSI-CE), te
          informamos de los datos del titular de zenetlabs.com.
        </p>
        <p>{describeEntity(legalEs.holder, entity, 'es')}</p>
        <p>
          Puedes contactar con el titular por correo electrónico en{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>{' '}
          o mediante el{' '}
          <a href={pagePath('es', 'contact')} className={TEXT_LINK}>
            formulario de contacto
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.object}>
        <p>
          Este sitio web presenta los servicios de consultoría de IA de Zenet
          Labs (formación, implementación de agentes y automatizaciones,
          integraciones y desarrollo web y de aplicaciones a medida) y permite a
          los visitantes conocer sus precios orientativos y ponerse en contacto
          con el titular. Los servicios se dirigen a empresas y profesionales, y
          cada proyecto se rige por el presupuesto y el contrato que se firman
          aparte. El titular no está adherido a ningún código de conducta.
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.prices}>
        <p>
          Los precios que se muestran en este sitio web están expresados en
          euros y no incluyen el IVA ni otros impuestos indirectos aplicables.
          El precio del diagnóstico es cerrado; los demás importes son precios
          «desde» o rangos orientativos, y el precio definitivo de cada proyecto
          se fija en el presupuesto que se entrega tras el diagnóstico. En este
          sitio web no se contrata ni se paga ningún servicio.
        </p>
        {__CALCULATOR__ ? (
          <p>
            Las estimaciones de la calculadora de presupuesto son orientativas:
            se calculan con tus respuestas y no constituyen una oferta
            vinculante.
          </p>
        ) : null}
      </LegalSection>
      <LegalSection section={SECTIONS.terms}>
        <p>
          El acceso al sitio es gratuito y no requiere registro. Te comprometes
          a usarlo de forma lícita y de buena fe: sin dañar el sitio ni sus
          sistemas, sin acceder sin autorización a áreas restringidas, sin
          enviar contenidos ilícitos y sin hacer un uso abusivo de los
          formularios ni de las demás herramientas del sitio. El titular puede
          limitar el acceso de quien incumpla estas condiciones.
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.ip}>
        <p>
          Los contenidos, el diseño, el logotipo y el código de este sitio
          pertenecen al titular o a sus licenciantes y están protegidos por la
          normativa de propiedad intelectual e industrial. Puedes consultarlos y
          citarlos indicando la fuente; para cualquier otro uso, como su
          reproducción o distribución con fines comerciales, necesitas la
          autorización del titular. Las marcas de terceros que aparecen en él
          pertenecen a sus respectivos propietarios y se citan solo para
          identificar sus productos.
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.liability}>
        <p>
          La información del sitio es de carácter general y no constituye
          asesoramiento profesional, fiscal ni jurídico. El titular procura que
          sea exacta y esté actualizada, pero no garantiza la disponibilidad
          continua del sitio ni la ausencia de errores, y no responde de los
          daños que se deriven de su uso, salvo en los casos en que la ley no
          permita excluir esa responsabilidad.
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.links}>
        <p>
          El sitio enlaza a productos que opera el titular y a sitios de
          terceros. El titular no controla los sitios de terceros ni responde de
          sus contenidos, salvo que, conociendo su ilicitud, no retire el enlace
          con diligencia (art. 17 de la LSSI).
        </p>
      </LegalSection>
      <LegalSection section={SECTIONS.data}>
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
      <LegalSection section={SECTIONS.law}>
        <p>{legalEs.governingLaw}</p>
      </LegalSection>
      <LegalSection section={SECTIONS.changes}>
        <p>
          Podemos actualizar este aviso legal. Publicaremos la nueva versión
          aquí y actualizaremos la fecha de arriba.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
