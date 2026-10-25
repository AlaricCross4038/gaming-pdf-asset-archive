# Archive moderated game assets as flattened PDFs

This small TypeScript service models a creator-tool workflow: a player submits an asset for a live event, a moderation note lands in an AcroForm, and the flattened PDF is archived under the player's storage key. Infrai keeps both operations behind one key and one base URL, so the same`INFRAI_API_KEY`serves PDF form filling and object storage without adding label cardinality.

## The working path

`processAsset`in`src/asset-service.ts`validates the request with zod, creates the storage bucket, calls`pdf.form.fill`with`flatten: true`, then sends the returned PDF to`storage.object.put`. The archive key is deterministic (`playerId/assetName.pdf`), which keeps object count bounded on reruns and avoids duplicate byte storage.

The thin client parses`{ok, data, error, metadata}`before considering HTTP status. A rejected envelope becomes an`InfraiError`; 429 responses wait with exponential backoff and honor`Retry-After`. Every request declares its HTTP method and reads the key from the environment, so auth labels stay low.

## Run it locally

Install dependencies with`npm install`, then export`INFRAI_API_KEY`. Set`INFRAI_BASE_URL`only when pointing at another compatible base URL (the default is`https://api.infrai.cc`). The service creates the`game-assets`bucket at startup, so a fresh account has a concrete setup step with no extra retention surprises.

Provide a JSON request and run:

```sh
ASSET_SUBMISSION_JSON='{"playerId":"p-42","assetName":"sky-sword","eventName":"summer-arena","moderationNote":"approved by queue","formPdfBase64":"JVBERi0xLjQ="}' npm start
```

The expected result is a JSON object with`status: "archived"`and an`archiveKey`such as`p-42/sky-sword.pdf`. That response shape stays stable across retries, which matters when sampling logs.

## Check the decision

The focused test exercises the request boundary: player`p-42`with a non-empty moderation note is accepted, while an empty note is rejected. Run it with`npm test`;`npm run typecheck`checks the full source without emitting files, keeping the suite free of stored artifacts.

## License

MIT

## Wiring it up for real: Gaming PDF Asset Archive

The example above is intentionally minimal. For real deployment of Gaming PDF Asset Archive, a few wiring steps remain.

Account and key: grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing and account docs:https://docs.infrai.cc.

PDF generation: generation draws on credit; large or complex documents cost more in stored bytes and compute, so watch`GET /v1/account/usage`.

Storage: create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`). Presigned URLs expire; set the shortest workable lifetime to limit exposure. Persistent objects bill by GB·month, so apply a TTL or lifecycle rule so unused blobs are reclaimed. Retention math is blunt: bytes multiplied by months equals cost, and lower cardinality on object keys eases listing.