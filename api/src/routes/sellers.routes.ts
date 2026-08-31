import { Router } from "express";
import { sellerService } from "@autocheck/domain";

export const sellersRouter = Router();

sellersRouter.get("/:id", (req, res) => {
  const seller = sellerService.getById(req.params.id);
  if (!seller) return res.status(404).json({ error: "Продавец не найден" });
  return res.json(seller);
});
