import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import openrouterRouter from "./openrouter";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(openrouterRouter);

export default router;
