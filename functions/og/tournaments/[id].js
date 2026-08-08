import { createOgImageHandler } from '../../_shared/og-image.js';

export const onRequestGet = createOgImageHandler({ type: 'tournament', endpoint: 'booklists' });
