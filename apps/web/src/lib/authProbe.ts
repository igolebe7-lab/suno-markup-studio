export function shouldHydrateAuth({ dev, flag }: { dev: boolean; flag?: string }): boolean {
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return !dev;
}
