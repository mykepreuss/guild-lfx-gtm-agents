# Marketing OS Launcher

Status: durable cockpit source ready; private alpha remains on 0.2.5

The Launcher is the draft-only front door for a dedicated Guild Marketing OS workspace.

It:

- deterministically routes clear requests across Company Context Builder and the seven specialists;
- uses an LLM only when a request is genuinely ambiguous, accepting a strict route enum and one classifier format repair;
- reads the workspace-injected published context before declaring context missing;
- verifies installed workspace agents and exposes only the eight exact suite packages as callable tools;
- blocks itself, unrelated agents, recursive delegation, publishing, scheduling, spend, CRM mutation, credential setup, legal approval, and other external execution;
- delegates to the selected allowlisted specialist and returns the complete
  result to the originating Chat;
- validates required headings, evidence mode, and the V1 draft-only safety envelope;
- creates a durable workflow run before delegation and fails closed if that
  record cannot be created;
- retains every initial and format-repair attempt, allowing at most one
  format-only repair and never silently retrying substantive or safety failures;
- stores validated artifacts, workstream state, provenance, and handoffs through
  the tenant-bound Marketing OS state-service contract;
- resumes an incomplete route across sessions and renders a cockpit status table
  without requiring the user to paste the prior result;
- keeps internal package/version provenance out of the customer-facing status
  table while retaining it in durable records and the artifact receipt.

The earlier self-managed delegation path remains in Git and Guild version
history as a rollback. Live evidence showed its Messaging child completed while
the Launcher root remained dispatched. The active implementation uses Guild's
compiled, automatically managed runtime so the root suspend/resume cycle is
owned by the platform.

The 0.3.0 source declares the state service as a Guild service integration and
has end-to-end memory/PostgreSQL contract coverage. It has not been published to
the private workspace because Guild does not yet provide the trusted outbound
organization/workspace identity required by the service, and this environment
does not have the GCP deployment identity. The browser-proven 0.2.5 Launcher
therefore remains the private workspace default until both gates are satisfied.
