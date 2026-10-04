# Deploying r2-manager.aiconicstudio.ai

Since 2026-10-04 the live site is built **from this repo's source** by Dokploy. No Docker Hub image is
involved any more.

- **Dokploy:** project `file-system` → Application `r2-manager`. Source: `https://github.com/SamerElhamdo/storageui.git`, branch **`main`**, built with the root `Dockerfile`, port 3000.
- **Deploy:** every push to `main` deploys on its own, through a GitHub webhook (push events) to Dokploy's deploy URL. That URL carries a secret token: rotate it in Dokploy if it leaks, then update the webhook.
- **Work on a branch** (e.g. `media-studio`), check it with `bun run build`, then merge into `main` to ship.
- **Build-time value:** `NEXT_PUBLIC_APP_URL` is a Dokploy *build arg* because Next.js inlines it into the browser bundle. Runtime settings (`AUTH_*`, `STORAGE_n_*`) are in the Application's Environment.
- **Rollback:** in Dokploy, redeploy an earlier deployment or push a revert to `main`. The old image-based compose ("ui file system", `samerelhamdousa/storageui:presigned-share`) is stopped, with auto-deploy off, and kept as a last resort.
- `.github/workflows/docker-publish.yml` still builds that image when run by hand. It is optional now.
