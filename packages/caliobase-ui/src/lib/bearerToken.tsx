export function bearerToken(userAccessToken: string): HeadersInit | undefined {
  return { Authorization: `Bearer ${userAccessToken}` };
}
