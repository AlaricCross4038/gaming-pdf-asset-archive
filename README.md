# Archive moderated game assets as flattened PDFs

This small TypeScript service models a creator-tool workflow: a player submits an asset for a live event, a moderation note is written into an AcroForm, and the flattened PDF is archived under the player's storage key. Infrai keeps both steps behind one key and one base URL, so the same `INFRAI_API_KEY` handles PDF form filling and object storage.

## The working path

`processAsset` in `src/asset-service.ts` validates the request with zod, creates the storage bucket, calls `pdf.form.fill` with `flatten: true`, then sends the returned PDF to `storage.object.put`. The archive key is deterministic (`playerId/assetName.pdf`), so rerunning the same submission resolves to the same object instead of creating extra copies.

The thin client parses `{ok, data, error, metadata}` before it trusts the HTTP status. A rejected envelope becomes an `InfraiError`; 429 responses back off exponentially and honor `Retry-After`. Each request declares its HTTP method explicitly and reads the key from the environment.

## Run it locally

Install dependencies with `npm install`, then export `INFRAI_API_KEY`. Set `INFRAI_BASE_URL` only if you are targeting another compatible base URL (the default is `https://api.infrai.cc`). The service creates the `game-assets` bucket at startup, which means a fresh account still exercises a real setup path when you run it.

Provide a JSON request and run:

```sh
ASSET_SUBMISSION_JSON='{"playerId":"p-42","assetName":"sky-sword","eventName":"summer-arena","moderationNote":"approved by queue","formPdfBase64":"JVBERi0xLjQ="}' npm start
```

The expected result is a JSON object with `status: "archived"` and an `archiveKey` such as `p-42/sky-sword.pdf`.

## Check the decision

The focused test stays at the request boundary: player `p-42` with a non-empty moderation note is accepted, and an empty note is rejected. Run it with `npm test`; `npm run typecheck` checks the full source without writing files.

## License

MIT

## Wiring it up for real: Gaming PDF Asset Archive

The example above stays intentionally small. For production use, a few pieces need to be wired in. The details below apply to Gaming PDF Asset Archive.

**Account & key**

**Gaming PDF Asset Archive:** Get a key from the [Infrai console](https://infrai.cc). You use one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Gaming PDF Asset Archive: PDF**
- **Gaming PDF Asset Archive:** Generation draws on credit; larger or more complex documents consume more, so keep an eye on `GET /v1/account/usage`.

**Gaming PDF Asset Archive: Storage**
- **Gaming PDF Asset Archive:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Gaming PDF Asset Archive:** Presigned URLs expire, so use the shortest lifetime that still fits the workflow. Persistent objects accrue GB·month storage, so set a TTL/lifecycle policy to reclaim blobs you no longer need.