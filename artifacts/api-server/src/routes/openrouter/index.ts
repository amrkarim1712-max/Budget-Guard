import { Router, type IRouter } from "express";
import modelsRouter from "./models";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(modelsRouter);
router.use(conversationsRouter);
router.use(messagesRouter);

export default router;
