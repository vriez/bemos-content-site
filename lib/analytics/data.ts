/**
 * Dashboard data source.
 *
 * Today this returns the bundled seed snapshot (built from real content). When
 * a collector is wired up, publish an `AnalyticsSnapshot` JSON and either:
 *   - swap this function to read it at build time, or
 *   - point the dashboard's optional client refresh at its URL.
 * The dashboard only depends on the `AnalyticsSnapshot` shape, so neither the
 * page nor the tracker changes when the real feed comes online.
 */
import { AnalyticsSnapshot } from './schema';
import { buildSampleSnapshot } from './sample';

export function getSnapshot(): AnalyticsSnapshot {
  return buildSampleSnapshot();
}
