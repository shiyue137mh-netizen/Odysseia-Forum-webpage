import { buildThreadOgMetadata, createShareMetadataHandler } from '../../_shared/og.js';

export const onRequestGet = createShareMetadataHandler({
  resourceName: 'Thread',
  endpoint: (id) => `/internal/share-metadata/threads/${id}`,
  buildMetadata: buildThreadOgMetadata,
  canonicalPath: (id) => `/threads/${id}`,
  imagePath: (id) => `/og/threads/${id}`,
});
