#!/usr/bin/env bash
set -uo pipefail

SITE="https://zenetlabs.com"
ATTEMPTS=5
DELAY=10
failures=0

attempt() {
  local desc="$1"
  shift
  local n
  for n in $(seq 1 "$ATTEMPTS"); do
    if "$@"; then
      echo "ok   $desc"
      return 0
    fi
    [ "$n" -lt "$ATTEMPTS" ] && sleep "$DELAY"
  done
  echo "FAIL $desc"
  failures=$((failures + 1))
}

status_is() {
  local expected="$1" url="$2" got
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url") || return 1
  [ "$got" = "$expected" ]
}

status_is_not() {
  local unexpected="$1" url="$2" got
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url") || return 1
  [ "$got" != "$unexpected" ]
}

post_status_is() {
  local expected="$1" url="$2" got
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST \
    -H 'Origin: https://zenetlabs.com' -H 'Content-Type: application/json' \
    --data '{}' "$url") || return 1
  [ "$got" = "$expected" ]
}

post_json_status_is() {
  local expected="$1" url="$2" data="$3" got
  shift 3
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST \
    -H 'Content-Type: application/json' "$@" --data "$data" "$url") || return 1
  [ "$got" = "$expected" ]
}

health_shows() {
  local body
  body=$(curl -s --max-time 20 "${SITE}/api/health") || return 1
  grep -qF '"ok":true' <<<"$body" || return 1
  echo "     health: $body"
}

listed_iff_200() {
  local path="$1" sitemap listed got
  sitemap=$(curl -s --max-time 20 "${SITE}/sitemap.xml") || return 1
  grep -qF '</urlset>' <<<"$sitemap" || return 1
  listed=no
  grep -qF "<loc>${SITE}${path}</loc>" <<<"$sitemap" && listed=yes
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "${SITE}${path}") || return 1
  if [ "$listed" = yes ]; then [ "$got" = 200 ]; else [ "$got" = 404 ]; fi
}

redirects_to() {
  local url="$1" expected="$2" out code location
  out=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 20 "$url") || return 1
  code="${out%% *}"
  location="${out#* }"
  [ "$code" = "301" ] && [ "$location" = "$expected" ]
}

content_type_is() {
  local expected="$1" accept="$2" url="$3" got
  got=$(curl -s -o /dev/null -w '%{content_type}' -H "Accept: ${accept}" --max-time 20 "$url") || return 1
  [ "$got" = "$expected" ]
}

body_contains() {
  local body
  body=$(curl -s --max-time 20 "$1") || return 1
  grep -qF "$2" <<<"$body"
}

body_lacks_html() {
  local body
  body=$(curl -fs --compressed -H 'Accept: text/html' --max-time 20 "$1") || return 1
  grep -q '</html>' <<<"$body" || return 1
  ! grep -qE "$2" <<<"$body"
}

header_matches() {
  local accept="$1" url="$2" pattern="$3"
  local headers
  headers=$(curl -s -D - -o /dev/null -H "Accept: ${accept}" --max-time 20 "$url") || return 1
  tr -d '\r' <<<"$headers" | grep -qiE "$pattern"
}

for path in / /es /pricing /es/precios /about /es/sobre-nosotros /privacy /es/privacidad /es/cookies /es/aviso-legal \
  /services /es/servicios \
  /services/ai-automation /es/servicios/automatizacion-de-procesos \
  /services/integrations /es/servicios/integraciones \
  /services/ai-agents /es/servicios/agentes-de-ia \
  /services/custom-software /es/servicios/desarrollo-de-software-a-medida \
  /services/ai-training /es/servicios/formacion-ia-equipos \
  /es/servicios/integraciones/holded-prestashop /es/servicios/integraciones/holded-woocommerce /es/servicios/integraciones/holded-hubspot \
  /es/verifactu-integracion /es/sectores/agencias-de-viaje /case-studies/viatsy /es/casos/viatsy \
  /services.md /services/ai-automation.md /es/servicios.md /es/servicios/automatizacion-de-procesos.md \
  /es/verifactu-integracion.md /case-studies/viatsy.md \
  /robots.txt /sitemap.xml /llms.txt /es/llms.txt /llms-full.txt /es/llms-full.txt; do
  attempt "200 ${SITE}${path}" status_is 200 "${SITE}${path}"
done

for path in /this-does-not-exist /es/no-existe; do
  attempt "404 ${SITE}${path}" status_is 404 "${SITE}${path}"
done

for path in /pricing/calculator /es/precios/calculadora; do
  attempt "calculator ${path} is listed in the sitemap if and only if it answers 200" listed_iff_200 "$path"
done

for path in /book /es/reservar; do
  attempt "booking ${path} is listed in the sitemap if and only if it answers 200" listed_iff_200 "$path"
done

attempt "api health answers (prints the booking state)" health_shows
attempt "tools manifest lists book_meeting" body_contains "${SITE}/api/tools" '"book_meeting"'
attempt "405 GET /api/tools/get_pricing" status_is 405 "${SITE}/api/tools/get_pricing"
attempt "get_pricing answers 200" post_json_status_is 200 "${SITE}/api/tools/get_pricing" '{}'
attempt "check_availability answers 200 (ok or unavailable)" post_json_status_is 200 "${SITE}/api/tools/check_availability" '{}'
attempt "book_meeting without Origin is 403" post_json_status_is 403 "${SITE}/api/tools/book_meeting" '{}'
attempt "book_meeting with a wrong bearer is 401" post_json_status_is 401 "${SITE}/api/tools/book_meeting" '{}' -H 'Authorization: Bearer smoke-check'

attempt "301 http://zenetlabs.com/es" redirects_to "http://zenetlabs.com/es" "${SITE}/es"
for rule in \
  "/en|/" \
  "/en/privacy-policy|/privacy" \
  "/privacy-policy|/privacy" \
  "/cookies-policy|/cookies" \
  "/es/privacy-policy|/es/privacidad" \
  "/es/cookies-policy|/es/cookies" \
  "/es/privacy|/es/privacidad" \
  "/es/pricing|/es/precios" \
  "/precios|/pricing" \
  "/es/about|/es/sobre-nosotros" \
  "/sobre-nosotros|/about" \
  "/aviso-legal|/es/aviso-legal" \
  "/en/aviso-legal|/es/aviso-legal" \
  "/legal-notice|/es/aviso-legal" \
  "/es/|/es" \
  "/blog/x|/" \
  "/es/about-us|/es/sobre-nosotros" \
  "/about-us|/about" \
  "/en/pricing.md|/pricing.md" \
  "/es/services|/es/servicios" \
  "/servicios|/services" \
  "/es/services/ai-agents|/es/servicios/agentes-de-ia" \
  "/services/ai-agents/|/services/ai-agents" \
  "/verifactu|/es/verifactu-integracion" \
  "/es/case-studies/viatsy|/es/casos/viatsy" \
  "/servicios/integraciones/holded-hubspot|/es/servicios/integraciones/holded-hubspot" \
  "/case-studies/viatsy/|/case-studies/viatsy" \
  "/reservar|/book" \
  "/es/book|/es/reservar" \
  "/en/book|/book" \
  "/book/|/book"; do
  attempt "301 ${SITE}${rule%%|*}" redirects_to "${SITE}${rule%%|*}" "${SITE}${rule#*|}"
done

for host in www.zenetlabs.com zenettech.com www.zenettech.com zenettechnology.com www.zenettechnology.com sabatemartinez.com www.sabatemartinez.com; do
  attempt "301 https://${host}/es/cookies-policy?x=1" \
    redirects_to "https://${host}/es/cookies-policy?x=1" "${SITE}/es/cookies?x=1"
done

for path in / /es /pricing /es/precios /about /es/sobre-nosotros /privacy /es/privacidad /cookies /es/cookies /es/aviso-legal; do
  attempt "markdown ${SITE}${path}" content_type_is 'text/markdown; charset=utf-8' 'text/markdown' "${SITE}${path}"
done
for path in /index.md /es.md /pricing.md /es/precios.md /about.md /es/sobre-nosotros.md /privacy.md /es/privacidad.md /cookies.md /es/cookies.md /es/aviso-legal.md; do
  attempt "markdown ${SITE}${path}" content_type_is 'text/markdown; charset=utf-8' '*/*' "${SITE}${path}"
done
attempt "canonical link ${SITE}/es/precios.md" header_matches '*/*' "${SITE}/es/precios.md" '^link: <https://zenetlabs\.com/es/precios>; rel="canonical"$'
for path in /llms.txt /es/llms.txt /llms-full.txt /es/llms-full.txt; do
  attempt "noindex ${SITE}${path}" header_matches '*/*' "${SITE}${path}" '^x-robots-tag: noindex$'
done
attempt "es llms.txt has the FAQ" body_contains "${SITE}/es/llms.txt" '## Preguntas frecuentes'
attempt "html for */* ${SITE}/" content_type_is 'text/html; charset=utf-8' '*/*' "${SITE}/"
attempt "vary accept ${SITE}/" header_matches '*/*' "${SITE}/" '^vary:(.*[ ,])?accept([ ,]|$)'
attempt "footer names the entity" body_contains "${SITE}/es" 'Zenet Technology Pte. Ltd.'
attempt "home carries the FAQ JSON-LD" body_contains "${SITE}/" '"@type":"FAQPage"'
attempt "service page carries the Service JSON-LD" body_contains "${SITE}/services/ai-automation" '"@type":"Service"'
attempt "service page carries the FAQ JSON-LD" body_contains "${SITE}/services/ai-automation" '"@type":"FAQPage"'
attempt "case page carries the Article JSON-LD" body_contains "${SITE}/case-studies/viatsy" '"@type":"Article"'
attempt "pair page carries the Service JSON-LD" body_contains "${SITE}/es/servicios/integraciones/holded-prestashop" '"@type":"Service"'
attempt "Verifactu page shows when the dates were checked" body_contains "${SITE}/es/verifactu-integracion" 'Fechas revisadas el'
attempt "es service page states the tax" body_contains "${SITE}/es/servicios/agentes-de-ia" 'IVA no incluido'
attempt "es pricing states the tax" body_contains "${SITE}/es/precios" 'no incluyen el IVA'
attempt "robots disallows server functions" body_contains "${SITE}/robots.txt" 'Disallow: /_serverFn/'
attempt "robots disallows internal" body_contains "${SITE}/robots.txt" 'Disallow: /internal/'
attempt "405 GET /api/lead" status_is 405 "${SITE}/api/lead"
attempt "400 POST /api/lead {}" post_status_is 400 "${SITE}/api/lead"
attempt "internal leads not public" status_is_not 200 "${SITE}/internal/leads"
attempt "internal leads csv not public" status_is_not 200 "${SITE}/internal/leads.csv"
attempt "canonical link ${SITE}/es" header_matches 'text/markdown' "${SITE}/es" '^link: <https://zenetlabs\.com/es>; rel="canonical"$'

for path in / /es; do
  attempt "no Google tag in ${SITE}${path}" body_lacks_html "${SITE}${path}" 'gtag/js|googletagmanager|zaraz'
  # Remove the consent-default check in the activation PR that sets production ga4Id.
  attempt "no consent defaults in ${SITE}${path}" body_lacks_html "${SITE}${path}" "'consent','default'"
done

attempt "200 https://albert.sabatemartinez.com/" status_is 200 "https://albert.sabatemartinez.com/"

if [ "$failures" -gt 0 ]; then
  echo "${failures} smoke check(s) failed"
  exit 1
fi
echo "all smoke checks passed"
