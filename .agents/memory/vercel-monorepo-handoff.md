---
name: Vercel monorepo handoff
description: Deployment checks and connector-specific lessons for publishing this workspace's frontend to Vercel.
---

When a Vercel project shows a generic 404 after a GitHub update, first verify that the deployment is using the intended branch and commit, then provide an explicit root `vercel.json` build/output configuration for the workspace frontend and SPA rewrites for client-side routes.

**Why:** The repository can contain a complete app while Vercel still points at an earlier bootstrap commit or cannot infer the correct package and output directory from the monorepo.

**How to apply:** Run the package typecheck and production build locally, publish the source-only tree, verify the remote commit/tree, and recheck the public URL after the deployment has had time to rebuild.

The GitHub connector's shell transport normalizes null separators in command output. Use newline-separated file lists when assembling a multi-file snapshot for connector writes; otherwise paths can be concatenated before reads begin.