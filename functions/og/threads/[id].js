import { createOgImageHandler } from '../../_shared/og-image.js';

export const onRequestGet = createOgImageHandler({ type: 'thread', endpoint: 'threads' });
