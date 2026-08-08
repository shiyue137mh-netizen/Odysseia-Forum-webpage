import {
  buildTournamentOgMetadata,
  createShareMetadataHandler,
} from '../../_shared/og.js';

export const onRequestGet = createShareMetadataHandler({
  resourceName: 'Tournament',
  endpoint: (id) => `/internal/share-metadata/booklists/${id}`,
  buildMetadata: buildTournamentOgMetadata,
  canonicalPath: (id) => `/tournaments/${id}`,
  imagePath: (id) => `/og/tournaments/${id}`,
});
