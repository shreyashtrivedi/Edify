import { Router } from 'express';
import { getMe, syncMe } from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.js';
import { syncProfileSchema } from '../schemas/user.schemas.js';

const router = Router();

router.get('/me', getMe);
router.put('/me', validate({ body: syncProfileSchema }), syncMe);

export default router;
