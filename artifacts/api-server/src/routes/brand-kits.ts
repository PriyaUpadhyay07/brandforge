import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, brandKitsTable } from "@workspace/db";
import {
  CreateBrandKitBody,
  CreateBrandKitResponse,
  DeleteBrandKitParams,
  GetBrandKitParams,
  GetBrandKitResponse,
  ListBrandKitsResponse,
  UpdateBrandKitBody,
  UpdateBrandKitParams,
  UpdateBrandKitResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toApiKit(kit: typeof brandKitsTable.$inferSelect) {
  return {
    id: kit.id,
    brandName: kit.brandName,
    industry: kit.industry,
    primaryColor: kit.primaryColor,
    personality: kit.personality,
    headingFont: kit.headingFont,
    bodyFont: kit.bodyFont,
    tagline: kit.tagline,
    toneNotes: kit.toneNotes,
    createdAt: kit.createdAt.toISOString(),
  };
}

router.get("/brand-kits", async (_req, res): Promise<void> => {
  const kits = await db
    .select()
    .from(brandKitsTable)
    .orderBy(asc(brandKitsTable.createdAt));
  res.json(ListBrandKitsResponse.parse(kits.map(toApiKit)));
});

router.post("/brand-kits", async (req, res): Promise<void> => {
  const parsed = CreateBrandKitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [kit] = await db.insert(brandKitsTable).values(parsed.data).returning();
  res.status(201).json(CreateBrandKitResponse.parse(toApiKit(kit)));
});

router.get("/brand-kits/:id", async (req, res): Promise<void> => {
  const params = GetBrandKitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [kit] = await db
    .select()
    .from(brandKitsTable)
    .where(eq(brandKitsTable.id, params.data.id));

  if (!kit) {
    res.status(404).json({ error: "Brand kit not found" });
    return;
  }

  res.json(GetBrandKitResponse.parse(toApiKit(kit)));
});

router.patch("/brand-kits/:id", async (req, res): Promise<void> => {
  const params = UpdateBrandKitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBrandKitBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [kit] = await db
    .update(brandKitsTable)
    .set(body.data)
    .where(eq(brandKitsTable.id, params.data.id))
    .returning();

  if (!kit) {
    res.status(404).json({ error: "Brand kit not found" });
    return;
  }

  res.json(UpdateBrandKitResponse.parse(toApiKit(kit)));
});

router.delete("/brand-kits/:id", async (req, res): Promise<void> => {
  const params = DeleteBrandKitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [kit] = await db
    .delete(brandKitsTable)
    .where(eq(brandKitsTable.id, params.data.id))
    .returning({ id: brandKitsTable.id });

  if (!kit) {
    res.status(404).json({ error: "Brand kit not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;