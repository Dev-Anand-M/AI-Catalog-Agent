import { db } from './_lib/db.js';

/**
 * GET /api/health
 *
 * Reports database reachability so "the app is broken" can be told apart from
 * "the database is unreachable" in a single request.
 */
export default async function handler(req, res) {
  const database = await db.checkConnection();

  // Always 200: the status code reports that the service is answering, the payload
  // reports whether the database is reachable. (Matches the Express API.)
  res.json({
    status: database.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database
  });
}
