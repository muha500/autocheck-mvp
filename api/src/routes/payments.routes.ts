import { Router } from "express";
import { paymentService, checkPipeline } from "@autocheck/domain";

export const paymentsRouter = Router();

paymentsRouter.post("/", async (req, res) => {
  const { userId, jobId } = req.body ?? {};
  if (!userId || !jobId) return res.status(400).json({ error: "userId и jobId обязательны" });
  const payment = await paymentService.createCheckPayment(userId, jobId);
  return res.status(201).json(payment);
});

/**
 * Webhook подтверждения оплаты от платёжной системы (реальная реализация зависит
 * от провайдера — Telegram Stars/эквайринг). Идемпотентно: повторный webhook с тем же
 * paymentId не должен запускать проверку дважды (см. checkPipeline.runAfterPayment).
 */
paymentsRouter.post("/webhook", async (req, res) => {
  const { jobId, paymentId } = req.body ?? {};
  if (!jobId || !paymentId) return res.status(400).json({ error: "jobId и paymentId обязательны" });
  try {
    const report = await checkPipeline.runAfterPayment(jobId, paymentId);
    return res.json({ status: "ok", reportId: report.id });
  } catch (err: any) {
    return res.status(422).json({ error: err.message });
  }
});
