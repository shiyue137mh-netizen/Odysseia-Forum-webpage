import { buildAuthorOgMetadata, createShareMetadataHandler } from '../_shared/og.js';

export const onRequestGet = createShareMetadataHandler({
  resourceName: 'Author',
  endpoint: (id) => `/internal/share-metadata/authors/${id}`,
  buildMetadata: buildAuthorOgMetadata,
  imageType: 'authors',
  crawlerOnly: true,
});
