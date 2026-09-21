import login from './login.js';
import signup from './signup.js';
import me from './me.js';
import changePassword from './change-password.js';

/**
 * /api/auth?action=...
 *
 * The client addresses auth through a single query-parameter endpoint, so this
 * dispatcher forwards to the per-action handlers rather than duplicating them.
 * (Without it, `/api/auth?action=login` used to 404 on Vercel while working locally.)
 */
export default async function handler(req, res) {
  const action = req.query?.action;

  switch (action) {
    case 'login':
      return login(req, res);
    case 'signup':
      return signup(req, res);
    case 'me':
      return me(req, res);
    case 'change-password':
      return changePassword(req, res);
    default:
      return res.status(404).json({ error: 'Unsupported auth action' });
  }
}
