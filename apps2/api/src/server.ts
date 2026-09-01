import express from "express";
import { env } from "@autocheck/domain";
import { checksRouter } from "./routes/checks.routes";
import { vehiclesRouter } from "./routes/vehicles.routes";
import { paymentsRouter } from "./routes/payments.routes";
import { listingsRouter } from "./routes/listings.routes";
import { sellersRouter } from "./routes/sellers.routes";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/checks", checksRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/sellers", sellersRouter);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`AutoCheck API listening on :${env.port}`);
});
