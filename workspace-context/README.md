# Guild Workspace Context

This folder contains source drafts and reference text for Guild workspace context.

Guild workspace context is the Platform Context layer injected into every agent run, so keep it concise. It should route agents to the right project facts and operating rules without becoming a full wiki or a raw source corpus.

The Company Context Builder is the normal publishing path. After a user approves a company context packet and sends exactly `publish approved context to workspace context`, it publishes a compact managed workspace context brief through the host-controlled bridge while preserving unmanaged manual context before and after the managed block.

Use `guild-marketing-os-workspace-context.md` as a maintainer reference for the active `michaelpreuss/guild-marketing-os` workspace. Do not publish workspace context directly from this repo; external Guild users should work through the Company Context Builder flow.
