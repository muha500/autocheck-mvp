import { Router } from "express";
import { checkPipeline, paymentService } from "@autocheck/domain";

export const checksRouter = Router();

/**
 * POST /api/checks
 * Создаёт job проверки и платёж. Реальный запуск конвейера — только после
 * подтверждения оплаты через POST /api/payments/webhook (см. ТЗ п.19-20).
 */
checksRouter.post("/", async (req, res) => {
  const { userId, vin, plate, listingUrl } = req.body ?? {};
  if (!userId || (!vin && !plate && !listingUrl)) {
    return res.status(400).json({ error: "userId и один из vin/plate/listingUrl обязательны" });
  }
  const job = await checkPipeline.createJob(userId, { vin, plate, listingUrl });
  const payment = await paymentService.createCheckPayment(userId, job.id);
  return res.status(201).json({ job, payment });
});

/** GET /api/checks/:id — статус job (poll вместо долгого HTTP-запроса) */
checksRouter.get("/:id", (req, res) => {
  const job = checkPipeline.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job не найден" });
  const report = job.reportId ? checkPipeline.getReport(job.reportId) : undefined;
  return res.json({ job, report });
});
