import app from "./app";
import { logger } from "./lib/logger";
import { db, brandKitsTable } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  const existing = await db.select({ id: brandKitsTable.id }).from(brandKitsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(brandKitsTable).values([
      {
        brandName: "Morrow",
        industry: "Climate tech",
        primaryColor: "#D8F05A",
        personality: "Clear, optimistic, quietly bold",
        headingFont: "Bricolage Grotesque",
        bodyFont: "DM Sans",
        tagline: "Better days, designed in.",
        toneNotes: "Warm, specific, never preachy.",
      },
      {
        brandName: "Common Ground",
        industry: "Independent hospitality",
        primaryColor: "#E7A77A",
        personality: "Witty, generous, a little unexpected",
        headingFont: "Fraunces",
        bodyFont: "DM Sans",
        tagline: "Pull up a chair.",
        toneNotes: "Sound like a thoughtful host.",
      },
      {
        brandName: "Arcform",
        industry: "Architecture studio",
        primaryColor: "#A9C5E8",
        personality: "Precise, human, forward-looking",
        headingFont: "Bricolage Grotesque",
        bodyFont: "Space Mono",
        tagline: "The shape of what is next.",
        toneNotes: "Measured, visual, confident.",
      },
      {
        brandName: "Field Notes",
        industry: "Independent publishing",
        primaryColor: "#C98D63",
        personality: "Curious, thoughtful, beautifully direct",
        headingFont: "DM Serif Display",
        bodyFont: "Plus Jakarta Sans",
        tagline: "Stories with somewhere to go.",
        toneNotes: "Literary without the distance.",
      },
    ]);
    logger.info("Seeded example brand kits");
  }

  app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Error starting server");
  process.exit(1);
});
