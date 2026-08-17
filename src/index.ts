/**
 * Host face for the web-profile bundle.
 *
 * The feature is deliberately browser-only: a conversation navigator must
 * not add model instructions, mutate sessions, or expose an HTTP surface.
 */

export const inject: readonly string[] = []

export function apply(): void {
  // The bundle row is needed to load ./client; the host has no work to do.
}
