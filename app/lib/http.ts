export function buildAuthHeaders(
  accessToken: string,
  headers: HeadersInit = {},
): HeadersInit {
  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`,
  };
}

export function buildTeamAuthHeaders(
  accessToken: string,
  teamId: string | null | undefined,
  headers: HeadersInit = {},
): HeadersInit {
  return {
    ...buildAuthHeaders(accessToken, headers),
    ...(teamId ? { "x-krythiq-team-id": teamId } : {}),
  };
}
