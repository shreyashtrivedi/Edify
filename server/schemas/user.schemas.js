import { z } from 'zod';

/** PUT /api/users/me: profile fields the frontend reads from Auth0 after login. */
export const syncProfileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.email().max(254).optional(),
  picture: z.url({ protocol: /^https$/ }).max(2048).optional(),
});
