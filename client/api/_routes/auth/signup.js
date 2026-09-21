/**
 * POST /api/auth/signup
 *
 * Self-serve registration is intentionally disabled. Stores are provisioned by our
 * onboarding team after an access request is approved (see /api/access-requests), so
 * the route stays only to answer older clients clearly instead of 404-ing them.
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.status(403).json({
    error: 'Self-serve sign-up is disabled. Request access and our team will set up your store with you.',
    code: 'SIGNUP_DISABLED',
    requestAccessUrl: '/request-access'
  });
}
