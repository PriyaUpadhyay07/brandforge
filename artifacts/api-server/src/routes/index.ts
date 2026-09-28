import { Router, type IRouter } from "express";
import healthRouter from "./health";
import brandKitsRouter from "./brand-kits";
import brandVoiceRouter from "./brand-voice";

const router: IRouter = Router();

router.use(healthRouter);
router.use(brandKitsRouter);
router.use(brandVoiceRouter);

export default router;
