// Seeds the LOCAL Secrets Store with a throwaway Google service-account bundle
// for the fake Google in scripts/fake-services.mjs. The key is generated here,
// never committed, and never valid for Google. Usage:
//   node scripts/local-calendar-secret.mjs <store-id>
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';

const NAME = 'ZENETLABS_PROD_GOOGLE_CALENDAR';
const [storeId] = process.argv.slice(2);
if (!storeId) {
  console.error('usage: node scripts/local-calendar-secret.mjs <store-id>');
  process.exit(1);
}

function wrangler(...args) {
  return execFileSync('pnpm', ['exec', 'wrangler', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

if (wrangler('secrets-store', 'secret', 'list', storeId).includes(NAME)) {
  console.log(`${NAME} already exists locally, leaving it alone`);
  process.exit(0);
}

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const bundle = {
  type: 'service_account',
  client_email: 'booking@local-project.iam.example.com',
  private_key_id: 'local-key-id',
  private_key: privateKey,
  subject: 'calendar-owner@example.com',
  calendar_id: 'local-main',
  test_calendar_id: 'local-test',
};

wrangler(
  'secrets-store',
  'secret',
  'create',
  storeId,
  '--name',
  NAME,
  '--value',
  JSON.stringify(bundle),
  '--scopes',
  'workers',
);
console.log(`created local ${NAME}`);
