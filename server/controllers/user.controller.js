import * as userService from '../services/user.service.js';

/** GET /api/users/me */
export async function getMe(req, res) {
  const user = await userService.getProfile(req.user.sub);
  res.json({ user });
}

/** PUT /api/users/me   body: { name?, email?, picture? } */
export async function syncMe(req, res) {
  const user = await userService.syncProfile(req.user.sub, req.body);
  res.json({ user });
}
