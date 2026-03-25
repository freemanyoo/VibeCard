# OpenClaw Update Plan

## Current State
- Current Synology source: `/volume1/docker/openclaw_1`
- Current running image: `openclaw:local`
- Current version: `2026.2.23`
- Latest cloned source: `/volume1/docker/openclaw_latest`
- Latest upstream version checked on 2026-03-11: `2026.3.9`
- Delta from current deployed source to upstream: `3455` commits behind

## Constraint
- Existing Synology settings, tokens, session data, compose data mounts must not be changed.
- Upgrade must be validated in a separate path before any existing container is replaced.

## What Was Customized In The Current Deployment
### 1. Gateway file upload support
Files:
- `src/gateway/openai-files-http.ts` (new custom file)
- `src/gateway/server-http.ts`

Purpose:
- Adds `/v1/files` compatible upload/list/get/delete/content endpoints.
- Stores uploaded files under workspace `files-api` index.
- Required for image/file handoff into later AI requests.

### 2. `file_id` support in OpenResponses input processing
Files:
- `src/gateway/openresponses-http.ts`
- `src/media/input-files.ts`

Purpose:
- Accepts `input_image` and `input_file` with `source.type = file_id`.
- Resolves the uploaded file from `files-api/index.json` and loads actual file bytes.
- This is the core path for actual file-based AI analysis.

### 3. Session key passthrough in gateway APIs
Files:
- `src/gateway/openai-http.ts`
- `src/gateway/openresponses-http.ts`

Purpose:
- Allows `session_key` / `SessionKey` from request body.
- Keeps per-session routing stable when requests are proxied externally.

### 4. Workspace/media path normalization
Files:
- `src/media-understanding/attachments.ts`
- `src/auto-reply/reply/stage-sandbox-media.ts`

Purpose:
- Resolves `/workspace/...`, `workspace/...`, `media/...`, `files-api/...` to actual state/workspace paths.
- Allows both inbound media and `files-api` stored files to be staged into the sandbox.
- Required because your current flows use both Telegram inbound media and web-uploaded files.

### 5. Direct sandbox image reading
Files:
- `src/agents/pi-tools.read.ts`
- `src/agents/tools/image-tool.ts`
- `src/agents/sandbox/docker.ts`

Purpose:
- Lets image reads return actual image content directly in tool results.
- Helps image handling survive sandbox restrictions when regular read tools fail.

### 6. UI / i18n / compose / Docker adjustments
Files:
- `docker-compose.yml`
- `Dockerfile`
- `.dockerignore`
- `ui/src/...`

Purpose:
- Environment-specific deployment tweaks.
- UI text/translation tweaks.
- These are lower priority than gateway/media functionality.

## What Must Exist In The Updated Build
### Mandatory
1. `/v1/files` upload endpoint
2. `file_id` support for `input_image` and `input_file`
3. workspace/files-api path resolution
4. sandbox staging from both `media` and `files-api`
5. session key passthrough for external callers

### Secondary
1. direct image read fallback
2. UI/i18n changes
3. compose/docker convenience changes

## Safest Rollout Path
1. Keep current deployment untouched.
2. Build and test from `/volume1/docker/openclaw_latest` using a different image tag, for example `openclaw:2026.3.9-custom`.
3. Reapply only the mandatory custom features listed above.
4. Start a separate test gateway on unused ports.
5. Validate these scenarios:
   - `/v1/files` upload works
   - uploaded `file_id` can be used in AI image analysis
   - Telegram inbound media still stages correctly
   - current external clients can still pass `session_key`
6. Only after validation, repoint the existing compose files to the new image tag.

## Immediate Recommendation
Do not update the existing `openclaw:local` image in place.
The correct next step is to patch `/volume1/docker/openclaw_latest` with the mandatory features, build a new image tag, and test it separately.
