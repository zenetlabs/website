import { LegalSection } from '@/components/legal-page';

// The parts of the privacy page that depend on the assistant and on voice, so
// the page itself reads straight through. Each renders nothing while its feature is dark.

export function AssistantSection() {
  if (!__ASSISTANT__) return null;
  return (
    <LegalSection title="El asistente de la web">
      <p>
        Nuestra web tiene un asistente de IA, que te indica que es una IA antes
        de que le escribas. Cuando lo usas, tratamos tus mensajes, sus
        respuestas, la página en la que estabas y la hora, para responderte y
        evitar abusos del servicio.
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
        conexión al día. Para ello guardamos, hasta dos días, una huella
        unidireccional con clave de tu dirección IP: no se puede convertir de
        nuevo en la dirección y no está vinculada a tu conversación.
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
        Si empiezas una llamada de voz con el asistente, el audio de tu
        micrófono se transmite a ElevenLabs (ElevenLabs Inc., Estados Unidos),
        nuestro proveedor de voz, que lo transcribe, genera las respuestas del
        asistente con un modelo de IA que aloja y las pronuncia. No grabamos el
        audio y hemos configurado ElevenLabs para que no conserve grabaciones.
        ElevenLabs guarda el texto de la conversación 30 días y después lo
        borra.
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

export function AssistantBasis() {
  if (!__ASSISTANT__) return null;
  return (
    <li>
      El interés legítimo en responder a las preguntas sobre nuestros servicios
      mediante el asistente y en evitar su uso abusivo (art. 6.1.f del RGPD).
      Cuando le pides una llamada, la aplicación de medidas precontractuales a
      petición tuya (art. 6.1.b del RGPD).
    </li>
  );
}

export function VoiceBasis() {
  if (!__VOICE__) return null;
  return (
    <li>
      El interés legítimo en responder por voz a las preguntas sobre nuestros
      servicios y en evitar abusos (art. 6.1.f del RGPD). Cuando pides una
      llamada, la aplicación de medidas precontractuales a petición tuya (art.
      6.1.b del RGPD).
    </li>
  );
}

export function CloudflareProcessor() {
  return (
    <li>
      {__ASSISTANT__ ? (
        <>
          Cloudflare, para alojar el sitio, guardar las consultas y las
          conversaciones del asistente en una base de datos en la Unión Europea,
          ejecutar el modelo de IA del asistente (Workers AI), proteger los
          formularios y el asistente con Turnstile y medir el tráfico con Web
          Analytics sin cookies.
        </>
      ) : (
        <>
          Cloudflare, para alojar el sitio, guardar las consultas en una base de
          datos en la Unión Europea, proteger el formulario con Turnstile y
          medir el tráfico con Web Analytics sin cookies.
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
    <>
      {' '}
      Cloudflare puede ejecutar el modelo del asistente en centros de datos
      fuera de la Unión Europea.
    </>
  );
}

export function VoiceTransfer() {
  if (!__VOICE__) return null;
  return (
    <>
      {' '}
      {/* TODO(albert): confirmar que el DPA de ElevenLabs cubre el plan y si su certificación del Marco de Privacidad de Datos UE-EE. UU. aplica */}
      ElevenLabs trata las llamadas de voz en Estados Unidos con las cláusulas
      contractuales tipo de la Comisión Europea.
    </>
  );
}

export function AssistantRetention() {
  if (!__ASSISTANT__) return null;
  return (
    <p>
      Borramos las conversaciones del asistente 30 días después de que empiecen.
      Si durante la misma visita reservas una llamada o nos envías una consulta,
      la conversación se conserva con esa consulta y se borra con ella.
    </p>
  );
}

export function VoiceRetention() {
  if (!__VOICE__) return null;
  return (
    <p>
      Textos de las llamadas de voz: 30 días en ElevenLabs. Nuestros registros
      de llamadas de voz: 30 días. Los identificadores de la llamada que se
      guardan con una consulta siguen los 24 meses de la consulta.
    </p>
  );
}
