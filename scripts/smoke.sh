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

header_matches() {
  local accept="$1" url="$2" pattern="$3"
  curl -s -D - -o /dev/null -H "Accept: ${accept}" --max-time 20 "$url" | tr -d '\r' | grep -qiE "$pattern"
}

for path in / /es /privacy-policy /es/cookies-policy /robots.txt /sitemap.xml /llms.txt; do
  attempt "200 ${SITE}${path}" status_is 200 "${SITE}${path}"
done

attempt "404 ${SITE}/this-does-not-exist" status_is 404 "${SITE}/this-does-not-exist"

attempt "301 http://zenetlabs.com/es" redirects_to "http://zenetlabs.com/es" "${SITE}/es"
attempt "301 ${SITE}/blog/x" redirects_to "${SITE}/blog/x" "${SITE}/"
attempt "301 ${SITE}/es/about-us" redirects_to "${SITE}/es/about-us" "${SITE}/es"
attempt "301 ${SITE}/es/" redirects_to "${SITE}/es/" "${SITE}/es"
attempt "301 ${SITE}/privacy-policy/" redirects_to "${SITE}/privacy-policy/" "${SITE}/privacy-policy"

for host in www.zenetlabs.com zenettech.com www.zenettech.com zenettechnology.com www.zenettechnology.com sabatemartinez.com www.sabatemartinez.com; do
  attempt "301 https://${host}/es/cookies-policy?x=1" \
    redirects_to "https://${host}/es/cookies-policy?x=1" "${SITE}/es/cookies-policy?x=1"
done

for path in / /es /privacy-policy /es/privacy-policy /cookies-policy /es/cookies-policy; do
  attempt "markdown ${SITE}${path}" content_type_is 'text/markdown; charset=utf-8' 'text/markdown' "${SITE}${path}"
done
attempt "html for */* ${SITE}/" content_type_is 'text/html; charset=utf-8' '*/*' "${SITE}/"
attempt "vary accept ${SITE}/" header_matches '*/*' "${SITE}/" '^vary:(.*[ ,])?accept([ ,]|$)'
attempt "canonical link ${SITE}/es" header_matches 'text/markdown' "${SITE}/es" '^link: <https://zenetlabs\.com/es>; rel="canonical"$'

attempt "200 https://albert.sabatemartinez.com/" status_is 200 "https://albert.sabatemartinez.com/"

if [ "$failures" -gt 0 ]; then
  echo "${failures} smoke check(s) failed"
  exit 1
fi
echo "all smoke checks passed"
