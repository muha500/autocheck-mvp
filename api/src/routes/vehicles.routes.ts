import { Router } from "express";
import { repository, checkPipeline } from "@autocheck/domain";

export const vehiclesRouter = Router();

vehiclesRouter.get("/:id", (req, res) => {
  const vehicle = repository.vehicles.get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Автомобиль не найден" });
  return res.json(vehicle);
});

vehiclesRouter.get("/:id/report", (req, res) => {
  const report = Array.from(repository.reports.values()).find((r) => r.vehicle.id === req.params.id);
  if (!report) return res.status(404).json({ error: "Отчёт не найден" });
  return res.json(report);
});
