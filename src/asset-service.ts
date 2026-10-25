import { z } from "zod";
import { InfraiClient } from "./infrai-client.js";

export const assetSubmission = z.object({ playerId: z.string().min(1), assetName: z.string().min(1), eventName: z.string().min(1), moderationNote: z.string().min(1), formPdfBase64: z.string().min(1) });
export type AssetSubmission = z.infer<typeof assetSubmission>;

export async function processAsset(input: AssetSubmission, client = new InfraiClient()) {
  const submission = assetSubmission.parse(input);
  const bucket = "game-assets";
  const filled = await client.fillForm(submission.formPdfBase64, { player_id: submission.playerId, asset_name: submission.assetName, event_name: submission.eventName, moderation_note: submission.moderationNote });
  const archiveKey = `${submission.playerId}/${submission.assetName}.pdf`;
  await client.archive(bucket, archiveKey, filled.pdf);
  return { playerId: submission.playerId, archiveKey, status: "archived" as const };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.env.ASSET_SUBMISSION_JSON;
  if (!raw) throw new Error("Set ASSET_SUBMISSION_JSON to run the example");
  processAsset(JSON.parse(raw)).then((result) => console.log(JSON.stringify(result, null, 2)));
}
