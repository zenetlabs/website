let domains: Promise<ReadonlySet<string>> | undefined;

// The list is its own chunk, loaded by the booking request path only.
async function load(): Promise<ReadonlySet<string>> {
  const { DISPOSABLE_DOMAINS } = await import(
    '@/server/disposable-domains.generated'
  );
  return new Set(DISPOSABLE_DOMAINS.split('\n'));
}

function listed(): Promise<ReadonlySet<string>> {
  domains ??= load().catch((error: unknown) => {
    domains = undefined;
    throw error;
  });
  return domains;
}

// The address's domain or any parent of it (x.mailinator.com) is on the list.
export async function isDisposable(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  const set = await listed();
  const labels = domain.split('.');
  for (let index = 0; index < labels.length - 1; index += 1) {
    if (set.has(labels.slice(index).join('.'))) return true;
  }
  return false;
}
