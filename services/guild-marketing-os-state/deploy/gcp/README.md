# Google Cloud deployment

This Terraform module provisions the production-shaped infrastructure for the
Marketing OS state service:

- a digest-pinned Cloud Run service and separate migration job;
- a private-IP, regional Cloud SQL for PostgreSQL 16 instance with SSD storage,
  automated backups, point-in-time recovery, query insights, and a
  customer-managed encryption key;
- distinct runtime and migration PostgreSQL users and service accounts;
- Secret Manager credentials scoped to the identity that needs each one;
- a separate Cloud KMS key for source-record envelope encryption;
- direct VPC egress and private service networking; and
- public HTTPS invocation at the Cloud Run edge with application-level,
  fail-closed Guild JWT verification.

The endpoint is reachable from Guild because Guild's documented custom
integration flow does not currently establish Google Cloud IAM identity.
Reachability does not authorize an operation: every endpoint except
`/healthz` and `/readyz` requires a verified Guild-signed delegated JWT, and
tenant identity is derived from that JWT rather than request data.

## Hard release boundary

Do not apply this module with placeholder identity values. Public release
requires a documented Guild issuer, audience, JWKS URL, and claims contract
that binds organization, workspace, actor, session, task, and scopes. A
maintainer token, shared API key, unsigned header, or customer-supplied tenant
identifier is not an acceptable substitute.

The state service also leaves Guild context publication disabled until Guild
provides a delegated, workspace-scoped publisher with idempotency and
expected-current-revision behavior.

## Prerequisites

1. Use a dedicated Google Cloud project with billing enabled.
2. Configure an encrypted remote Terraform backend with tightly restricted
   access and versioning before the first real plan. Generated database
   passwords are sensitive and are present in Terraform state even though they
   are not exposed as outputs.
3. Build the state-service image from the repository Dockerfile, push it to an
   approved registry, scan it, and record its immutable `sha256` digest.
4. Obtain the real delegated-identity values directly from Guild.
5. Authenticate Terraform as an authorized deployment identity. Never use a
   shared maintainer Guild API token.

## Validate without deploying

```bash
export MARKETING_OS_TF_DATA_DIR="$(mktemp -d)"
TF_DATA_DIR="$MARKETING_OS_TF_DATA_DIR" terraform init -backend=false
TF_DATA_DIR="$MARKETING_OS_TF_DATA_DIR" terraform fmt -check
TF_DATA_DIR="$MARKETING_OS_TF_DATA_DIR" terraform validate
```

Copy `terraform.tfvars.example` to a file outside version control only after
the prerequisites are satisfied. The example deliberately fails the
project, image-digest, and delegated-identity validations until real values are
provided. Keeping `TF_DATA_DIR` outside the repository also prevents downloaded
provider binaries from entering public-source scans.

## Deploy

```bash
terraform plan -out=marketing-os.tfplan
terraform apply marketing-os.tfplan
gcloud run jobs execute guild-marketing-os-state-migrate \
  --region=us-west1 \
  --wait
```

Review the plan for project, region, principals, public ingress, deletion
protection, and immutable image digest before applying. Run the migration job
before directing any integration traffic to a new release.

After deployment:

1. confirm `/healthz` and `/readyz`;
2. verify unsigned, wrong-issuer, wrong-audience, stale, and tenant-spoofed
   requests fail closed;
3. run the full tenant-isolation, revision, idempotency, export, deletion, and
   backup/restore acceptance suite;
4. configure monitoring for Cloud Run 5xx responses, Cloud SQL saturation,
   failed migration jobs, KMS failures, and unusual rate-limit activity; and
5. record the service revision, image digest, database instance, key versions,
   migration execution, and acceptance evidence.

Do not make the Launcher or capability agents public until the separate-
organization and unaffiliated design-partner gates pass without maintainer CLI
or infrastructure credentials.
