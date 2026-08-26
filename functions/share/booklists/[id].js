import {
  buildBooklistOgMetadata,
  createShareMetadataHandler,
} from '../../_shared/og.js';

export const onRequestGet = createShareMetadataHandler({
  resourceName: 'Booklist',
  endpoint: (id) => `/internal/share-metadata/booklists/${id}`,
  buildMetadata: buildBooklistOgMetadata,
  canonicalPath: (id) => `/booklists/${id}`,
  imageType: 'booklists',
});
