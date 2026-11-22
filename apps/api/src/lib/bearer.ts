const BEARER = /^Bearer +(\S+)$/i;

export function bearerToken(
  authorization: string | undefined,
): string | undefined {
  return authorization === undefined
    ? undefined
    : BEARER.exec(authorization)?.[1];
}
