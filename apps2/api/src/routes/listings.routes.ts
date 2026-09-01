import { Router } from "express";
import { listingService } from "@autocheck/domain";

export const listingsRouter = Router();

listingsRouter.get("/", (req, res) => {
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
  return res.json(listingService.list({ maxPrice }));
});

listingsRouter.post("/", (req, res) => {
  const body = req.body ?? {};
  if (!body.vehicleId || !body.sellerId || !body.price || !body.source) {
    return res.status(400).json({ error: "vehicleId, sellerId, price, source обязательны" });
  }
  const listing = listingService.create({
    source: body.source,
    externalId: body.externalId,
    vehicleId: body.vehicleId,
    sellerId: body.sellerId,
    url: body.url,
    price: body.price,
    mileageKm: body.mileageKm,
    description: body.description,
    photos: body.photos ?? [],
  });
  return res.status(201).json(listing);
});
