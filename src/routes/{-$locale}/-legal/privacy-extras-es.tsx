// TODO(albert): counsel sign-off of the 2026-11-05 draft
import { LegalSection } from '@/components/legal-page';

// The parts of the privacy page that depend on a flagged feature, so the page
// itself reads straight through. Each renders nothing while its feature is dark.

export function AssistantSection() {
  if (!__ASSISTANT__) return null;
  return (
    <LegalSection title="El asistente de la web">
      <p>
        Nuestra web tiene un asistente de IA. Antes de que le escribas, te
        indica que es un sistema de IA y no una persona (art. 50 del Reglamento
        (UE) 2024/1689 de Inteligencia Artificial). Cuando lo usas, tratamos tus
        mensajes, sus respuestas, la página en la que estabas y la hora, para
        responderte y evitar abusos del servicio.
      </p>
      <p>
        Las respuestas las genera automáticamente un modelo de IA que funciona
        en Cloudflare Workers AI. Cloudflare no usa este contenido para entrenar
        modelos. Guardamos las conversaciones en nuestra base de datos en la
        Unión Europea y no guardamos con ellas tu dirección IP.
      </p>
      <p>
        Si reservas una llamada desde el asistente, el formulario de reserva del
        chat te pide el nombre y el email; se usan para la reserva y no se
        envían al modelo de IA.
      </p>
      <p>
        Para limitar los abusos contamos también cuántas preguntas hace cada
        conexión al día. Para ello guardamos una huella unidireccional con clave
        de tu dirección IP: no se puede convertir de nuevo en la dirección y no
        está vinculada a tu conversación. La huella de cada día se borra a las
        03:00 (hora UTC) de pasado mañana, es decir, unas 51 horas como máximo.
      </p>
      <p>
        El asistente puede equivocarse. Los precios y las fechas salen solo de
        nuestra información publicada, y una persona lee cada reserva y cada
        consulta. No compartas en el chat contraseñas, datos de salud ni otra
        información sensible.
      </p>
    </LegalSection>
  );
}

export function VoiceSection() {
  if (!__VOICE__) return null;
  return (
    <LegalSection title="Llamadas de voz">
      <p>
        Antes de empezar una llamada de voz con el asistente, te indicamos que
        hablarás con un sistema de IA y que la voz que oirás está generada por
        IA (art. 50 del Reglamento (UE) 2024/1689 de Inteligencia Artificial).
      </p>
      <p>
        Durante la llamada, el audio de tu micrófono se transmite a ElevenLabs
        (ElevenLabs Inc., Estados Unidos), nuestro proveedor de voz, que lo
        transcribe, genera las respuestas del asistente con un modelo de IA que
        aloja y las pronuncia. No grabamos el audio y hemos configurado
        ElevenLabs para que no conserve grabaciones. ElevenLabs guarda el texto
        de la conversación 30 días y después lo borra.
      </p>
      <p>
        Guardamos 30 días un registro técnico de la llamada (cuándo empezó, el
        idioma, tu zona horaria y la página, sin audio ni texto) para evitar
        abusos. Si reservas una llamada durante la conversación, tu nombre,
        email, empresa y tema se guardan con tu consulta, como en cualquier
        reserva, junto con los identificadores de la llamada (el de nuestro
        registro y el de la conversación en ElevenLabs). No usamos tu voz para
        identificarte.
      </p>
    </LegalSection>
  );
}

export function CalculatorUse() {
  if (!__CALCULATOR__) return null;
  return (
    <p>
      Si usas la calculadora de presupuesto, tus respuestas (el tipo de
      proyecto, el volumen de trabajo, las herramientas y las opciones que
      eliges) viajan en la dirección de la página de resultados, para que puedas
      guardarla o compartirla. Como cualquier dirección que visitas, llega a
      Cloudflare
      {__GA4_ID__ !== null
        ? '; si aceptas las cookies analíticas, la dirección que enviamos a Google Analytics las omite'
        : null}
      . No guardamos esas respuestas salvo que nos envíes una consulta desde el
      resultado: entonces se añaden a tu mensaje, junto con la estimación.
    </p>
  );
}

export function WebMcpUse() {
  if (!__WEBMCP__) return null;
  return (
    <p>
      Si tu navegador tiene un agente de IA compatible con WebMCP, el sitio le
      ofrece herramientas para consultar nuestras preguntas frecuentes, precios
      y estimaciones y para abrir páginas y, mientras la reserva de llamadas
      esté disponible, para buscar horas libres y proponer una llamada. Una
      reserva solo se envía cuando tú confirmas tus datos en el cuadro de
      diálogo de la página, y la tratamos como cualquier otra reserva. El agente
      lo eliges y lo controlas tú: lo que le cuentes o lo que lea de la página
      se rige por las condiciones de su proveedor, no por esta política.
    </p>
  );
}

export function AssistantBasis() {
  if (!__ASSISTANT__) return null;
  return (
    <li>
      Responder a tus preguntas mediante el asistente y evitar su uso abusivo:
      nuestro interés legítimo (art. 6.1.f del RGPD). Si le pides una llamada,
      la reserva se rige por la base de las consultas.
    </li>
  );
}

export function VoiceBasis() {
  if (!__VOICE__) return null;
  return (
    <li>
      Responder por voz a tus preguntas y evitar abusos: nuestro interés
      legítimo (art. 6.1.f del RGPD). Si pides una llamada, la reserva se rige
      por la base de las consultas.
    </li>
  );
}

export function CloudflareProcessor() {
  return (
    <li>
      {__ASSISTANT__ ? (
        <>
          Cloudflare (Cloudflare, Inc., Estados Unidos), para alojar el sitio,
          guardar las consultas y las conversaciones del asistente en una base
          de datos en la Unión Europea, ejecutar el modelo de IA del asistente
          (Workers AI), proteger los formularios y el asistente con Turnstile,
          guardar los registros técnicos del servidor y medir el tráfico con Web
          Analytics sin cookies.
        </>
      ) : (
        <>
          Cloudflare (Cloudflare, Inc., Estados Unidos), para alojar el sitio,
          guardar las consultas en una base de datos en la Unión Europea,
          proteger el formulario con Turnstile, guardar los registros técnicos
          del servidor y medir el tráfico con Web Analytics sin cookies.
        </>
      )}
    </li>
  );
}

export function VoiceProcessor() {
  if (!__VOICE__) return null;
  return (
    <li>
      ElevenLabs (ElevenLabs Inc., Estados Unidos), para las llamadas de voz con
      el asistente.
    </li>
  );
}

export function AssistantTransfer() {
  if (!__ASSISTANT__) return null;
  return (
    <li>
      Cloudflare puede ejecutar el modelo del asistente en centros de datos
      fuera de la Unión Europea, con las mismas garantías que el resto de sus
      servicios.
    </li>
  );
}

export function VoiceTransfer() {
  if (!__VOICE__) return null;
  return (
    <li>
      {/* TODO(albert): confirmar que el DPA de ElevenLabs cubre el plan contratado y si ElevenLabs Inc. está certificada en el Marco de Privacidad de Datos UE-EE. UU.; si lo está, añadirlo aquí */}
      ElevenLabs trata las llamadas de voz en Estados Unidos con las cláusulas
      contractuales tipo de la Comisión Europea incluidas en su acuerdo de
      tratamiento de datos.
    </li>
  );
}

export function AssistantRetention() {
  if (!__ASSISTANT__) return null;
  return (
    <li>
      Conversaciones del asistente: las borramos 30 días después de que
      empiecen. Si en las 24 horas siguientes a su inicio reservas una llamada o
      nos envías una consulta, la conversación se conserva con esa consulta y se
      borra con ella. Las huellas de las direcciones IP: hasta las 03:00 (UTC)
      de pasado mañana, unas 51 horas como máximo.
    </li>
  );
}

export function VoiceRetention() {
  if (!__VOICE__) return null;
  return (
    <li>
      Textos de las llamadas de voz: 30 días en ElevenLabs. Nuestros registros
      de llamadas de voz: 30 días. Los identificadores de la llamada que se
      guardan con una consulta siguen los 24 meses de la consulta.
    </li>
  );
}
