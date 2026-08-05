import { fetchAppShell } from '../_shared/og.js';

export function onRequestGet({ request, env }) {
  return fetchAppShell(request, env);
}
