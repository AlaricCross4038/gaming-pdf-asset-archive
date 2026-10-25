import assert from "node:assert/strict";
import { assetSubmission } from "../src/asset-service.js";

const parsed = assetSubmission.parse({ playerId: "p-42", assetName: "sky-sword", eventName: "summer-arena", moderationNote: "approved by queue", formPdfBase64: "JVBERi0xLjQ=" });
assert.equal(parsed.playerId, "p-42");
assert.throws(() => assetSubmission.parse({ ...parsed, moderationNote: "" }));
console.log("asset submission boundary: valid payload accepted, empty moderation note rejected");
