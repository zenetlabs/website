export type Limiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export async function isLimited(
  limiter: Limiter,
  key: string,
  label: string,
): Promise<boolean> {
  try {
    const { success } = await limiter.limit({ key });
    return !success;
  } catch {
    console.error(`${label}: limiter unavailable`);
    return false;
  }
}
