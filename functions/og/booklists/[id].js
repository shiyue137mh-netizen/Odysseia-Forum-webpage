import { createOgImageHandler } from '../../_shared/og-image.js';

export const onRequestGet = createOgImageHandler({ type: 'booklist', endpoint: 'booklists' });
