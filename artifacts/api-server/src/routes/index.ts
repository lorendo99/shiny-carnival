import { Router, type IRouter } from "express";
import healthRouter from "./health";
import diagnosesRouter from "./diagnoses";
import storageRouter from "./storage";
import marketplaceRouter from "./marketplace";
import helpRouter from "./help";
import premiumRouter from "./premium";
import accountRouter from "./account";
import inventoryRouter from "./inventory";
import mobileAnalyticsRouter from "./mobileAnalytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(diagnosesRouter);
router.use(marketplaceRouter);
router.use(helpRouter);
router.use(premiumRouter);
router.use(accountRouter);
router.use(inventoryRouter);
router.use(mobileAnalyticsRouter);

export default router;
