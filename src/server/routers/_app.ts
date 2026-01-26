// T017: Root tRPC router
import { router } from "../trpc/init";
import { authRouter } from "./auth";
import { organizationRouter } from "./organization";
import { userRouter } from "./user";
import { uploadRouter } from "./upload";
import { constituentRouter } from "./constituent";
import { giftRouter } from "./gift";
import { contactRouter } from "./contact";
import { analysisRouter } from "./analysis";
import { aiRouter } from "./ai";
import { alertRouter } from "./alert";
import { reportRouter } from "./report";
import { auditRouter } from "./audit";

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
  user: userRouter,
  upload: uploadRouter,
  constituent: constituentRouter,
  gift: giftRouter,
  contact: contactRouter,
  analysis: analysisRouter,
  ai: aiRouter,
  alert: alertRouter,
  report: reportRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
