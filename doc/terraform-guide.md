# Terraform Learning Guide — Acocie Stores Infrastructure

> A from-scratch walkthrough of **your own** Terraform code. Every concept below is
> explained using the exact files in `terraform/`, so you learn Terraform *and* understand
> your own AWS setup at the same time.
>
> Audience: you, having just deployed this API to AWS ECS Fargate + RDS, and being new to Terraform.

---

## Table of contents

1. [The mental model — what Terraform actually does](#1-the-mental-model)
2. [The 6 core building blocks of HCL](#2-the-6-core-building-blocks)
3. [How your repo is laid out](#3-how-your-repo-is-laid-out)
4. [State, and why `envs/backend/` exists](#4-state-and-the-backend)
5. [The composition root — `envs/dev/`](#5-the-composition-root)
6. [Module-by-module deep dive](#6-module-by-module-deep-dive)
7. [How the modules wire together (the dependency graph)](#7-how-the-modules-wire-together)
8. [How a request actually flows through your infra](#8-request-flow)
9. [How secrets work in your setup](#9-how-secrets-work)
10. [The everyday workflow & commands](#10-the-everyday-workflow)
11. [HCL language features you used (cheat sheet)](#11-hcl-language-features-cheat-sheet)
12. [Gotchas & things specific to your repo](#12-gotchas)
13. [Glossary](#13-glossary)
14. [Exercises to cement it](#14-exercises)

---

## 1. The mental model

**Terraform is a tool for describing cloud infrastructure as code (IaC).** Instead of clicking
around the AWS console to create a database, a load balancer, a network, etc., you *write down*
what you want in `.tf` files, and Terraform makes reality match your description.

The single most important idea:

> Terraform is **declarative**. You describe the *desired end state*, not the steps.
> Terraform figures out the steps by comparing **what you wrote** against **what already exists**.

That comparison needs three things:

| Thing | What it is | Where it lives in your repo |
|-------|-----------|------------------------------|
| **Configuration** | What you *want* | Your `.tf` files |
| **State** | What Terraform *thinks it already built* | An S3 bucket (`acocie-stores-terraform-state`) |
| **Real world** | What *actually exists* in AWS | Your AWS account `967649579229` |

Every time you run `terraform plan`, Terraform does:

```
desired config  vs  state  vs  real AWS   →   "here's what I'll add/change/destroy"
```

Then `terraform apply` executes that diff by calling AWS APIs for you.

This is why losing or corrupting state is dangerous: if Terraform forgets it built something,
it'll try to build it again (or worse, can't manage it anymore). That's the whole reason for
section 4.

---

## 2. The 6 core building blocks

Almost every `.tf` file you have is built from just six kinds of things. Learn these six and the
rest is detail.

### 2.1 `terraform {}` block — settings for Terraform itself

From `terraform/envs/dev/providers.tf`:

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

- `required_version = ">= 1.6"` — refuse to run on an old Terraform CLI.
- `required_providers` — declares you need the **AWS provider**, version 5.x (`~> 5.0` means
  "5.anything, but not 6.0"). A *provider* is a plugin that knows how to talk to a specific API —
  here, AWS. Terraform downloads it during `terraform init`.

### 2.2 `provider {}` block — configure that plugin

```hcl
provider "aws" {
  region = var.aws_region
}
```

This tells the AWS provider *which region* to operate in (`eu-central-1` / Frankfurt for you).
Credentials are picked up automatically from your environment (the same `aws configure` creds the
AWS CLI uses) — which is why you never see an access key in these files. Good.

### 2.3 `resource {}` — a real thing you want to exist

This is the heart of Terraform. From `terraform/modules/rds/main.tf`:

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-${var.environment}"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class
  ...
}
```

Read it as: **resource TYPE NAME { arguments }**

- `aws_db_instance` → the *type* (an RDS database instance). The provider defines all valid types.
- `main` → the *local name* you chose. It's only meaningful inside Terraform — you use it to refer
  to this resource elsewhere as `aws_db_instance.main`.
- The body → the settings AWS needs to create it.

### 2.4 `variable {}` — inputs (so code is reusable, not hard-coded)

From `terraform/modules/rds/variables.tf`:

```hcl
variable "instance_class" {
  description = "RDS instance type. Use db.t3.micro for dev, db.t3.small+ for higher envs."
  type        = string
  default     = "db.t3.micro"
}
```

A variable is a named input. Three useful fields:
- `type` — `string`, `number`, `bool`, `list(...)`, etc. Terraform rejects wrong types early.
- `description` — documentation (yours are excellent, keep doing this).
- `default` — value used if the caller doesn't pass one. **No default = the caller MUST provide it.**

You read a variable's value with `var.instance_class`.

### 2.5 `output {}` — values you want to expose

From `terraform/modules/rds/outputs.tf`:

```hcl
output "db_endpoint" {
  description = "RDS endpoint (host:port)..."
  value       = aws_db_instance.main.endpoint
}
```

Outputs do two jobs:
1. **Print useful values** after `apply` (e.g. your `api_url`).
2. **Pass values from a module up to whoever called it** (this is how your modules talk to each
   other — see section 7).

You retrieve an output on the CLI with `terraform output db_endpoint` — exactly the command you
used to get `db_secret_arn` when recovering your pgAdmin password.

### 2.6 `module {}` — a reusable bundle of resources

From `terraform/envs/dev/main.tf`:

```hcl
module "rds" {
  source                = "../../modules/rds"
  environment           = var.environment
  project               = var.project
  subnet_ids            = module.vpc.public_subnet_ids
  rds_security_group_id = module.vpc.rds_security_group_id
  instance_class        = "db.t3.micro"
  publicly_accessible   = true
}
```

A module is just **a folder of `.tf` files you call as a unit**. `source` points at the folder.
Everything after `source` is you *setting that module's input variables*. Think of a module like a
function: variables are its parameters, outputs are its return values, and `module "rds" { ... }`
is the function call.

---

## 3. How your repo is laid out

```
terraform/
├── main.tf, providers.tf, variables.tf, outputs.tf   ← ⚠️ legacy flat S3-only config (see §12)
│
├── envs/
│   ├── backend/        ← bootstraps remote state (S3 bucket + DynamoDB lock table)
│   │   ├── main.tf, outputs.tf, variables.tf, providers.tf
│   │   └── terraform.tfstate   ← this one env keeps its state locally on purpose
│   │
│   └── dev/            ← the DEV environment: wires all modules together
│       ├── main.tf          ← calls the 6 modules
│       ├── variables.tf     ← inputs for this env
│       ├── terraform.tfvars ← the actual values (region, project name, etc.)
│       ├── outputs.tf       ← surfaces api_url, db_endpoint, db_secret_arn, ...
│       ├── providers.tf     ← AWS provider + version pins
│       └── backend.tf       ← "store my state in the S3 bucket"
│
└── modules/            ← reusable building blocks (the "functions")
    ├── s3/    ← product-images bucket (public read, CORS, versioning, encryption)
    ├── ecr/   ← Docker image registry for the API + lifecycle cleanup rules
    ├── vpc/   ← network: VPC, subnets, NAT, route tables, 3 security groups
    ├── rds/   ← PostgreSQL database (managed master password)
    ├── alb/   ← Application Load Balancer + target group + HTTP listener
    └── ecs/   ← Fargate cluster, task definition, service, IAM roles, secrets, logs
```

**The key architectural pattern here is "modules + environments":**

- `modules/` = *reusable definitions*. They don't get deployed by themselves; they're templates.
- `envs/dev/` = a *composition root* that instantiates those modules with dev-specific values.
- Later you can add `envs/stage/` and `envs/prod/` that reuse the **same** modules with different
  inputs (bigger `instance_class`, `multi_az = true`, `publicly_accessible = false`, etc.).

This is the single biggest reason your infra is well-structured: **the "what" (modules) is separated
from the "where/how much" (environments).**

---

## 4. State, and the backend

### The problem state solves

Terraform must remember what it built. By default it writes this to a local file
`terraform.tfstate`. That's fine solo, but it has problems:
- If two people (or you on two machines) run `apply` at once, they corrupt each other.
- The state file contains **secrets in plaintext** (DB passwords, etc.) — you don't want it in git.
- Lose your laptop, lose your state.

### Your solution: a remote backend (S3 + DynamoDB)

`terraform/envs/backend/main.tf` creates two things:

```hcl
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name   # "acocie-stores-terraform-state"
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.lock_table_name   # "acocie-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute { name = "LockID"; type = "S" }
}
```

- **S3 bucket** = the shared, durable home for your state files. It has:
  - **versioning enabled** → you can roll back to a previous state if an apply goes wrong.
  - **encryption at rest** (AES256).
  - **all public access blocked** → because state contains secrets.
- **DynamoDB table** = a *lock*. Before any `apply`, Terraform writes a lock row keyed by `LockID`.
  If someone else is mid-apply, you get "state is locked" instead of a corrupted state. The table
  only ever holds one tiny row, hence `PAY_PER_REQUEST` (you pay basically nothing).

### The "chicken-and-egg" bootstrap problem (important!)

Notice `envs/backend/` keeps its **own** state *locally* (`envs/backend/terraform.tfstate` is
committed/present, not in S3). Why?

> You can't store the state-bucket's state *in* the state bucket — the bucket doesn't exist yet
> when you're creating it.

So the order of operations was:
1. `cd envs/backend && terraform apply` → creates the S3 bucket + lock table. Its own tiny state
   stays local.
2. Every *other* environment (`envs/dev`) then points at that bucket via `backend.tf`:

```hcl
# terraform/envs/dev/backend.tf
terraform {
  backend "s3" {
    bucket         = "acocie-stores-terraform-state"
    key            = "envs/dev/terraform.tfstate"   # the dev state's path inside the bucket
    region         = "eu-central-1"
    dynamodb_table = "acocie-terraform-locks"
    encrypt        = true
  }
}
```

`key` is the filename within the bucket. When you add `envs/prod/` later, it'll use the same
bucket with `key = "envs/prod/terraform.tfstate"` — same bucket, separate state files, no collisions.

---

## 5. The composition root (`envs/dev/main.tf`)

This file is where everything comes together. It's organized as **6 phases**, each a module call.
The comments (`Phase 1 — S3`, `Phase 2 — ECR`, ...) describe the order you built things in.

What makes this file powerful is that **modules feed each other via outputs → inputs**. Look at the
RDS and ECS calls:

```hcl
module "vpc" {
  source             = "../../modules/vpc"
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
  admin_cidr         = "197.155.74.246/32"   # ← your home IP, for pgAdmin access
  ...
}

module "rds" {
  source                = "../../modules/rds"
  subnet_ids            = module.vpc.public_subnet_ids       # ← from the VPC module
  rds_security_group_id = module.vpc.rds_security_group_id   # ← from the VPC module
  publicly_accessible   = true
  ...
}

module "ecs" {
  source                = "../../modules/ecs"
  db_endpoint           = module.rds.db_endpoint      # ← from RDS module
  db_secret_arn         = module.rds.db_secret_arn    # ← from RDS module
  alb_target_group_arn  = module.alb.target_group_arn # ← from ALB module
  ecr_repository_url    = module.ecr.repository_url   # ← from ECR module
  ...
}
```

`module.vpc.public_subnet_ids` means "the `public_subnet_ids` output of the module I named `vpc`."
**Terraform reads these references and automatically figures out the build order** — it knows RDS
needs the VPC's subnets, so it builds the VPC first. You never write "build X before Y"; the data
dependencies imply it. (This auto-ordering is one of Terraform's best features.)

> 💡 The `admin_cidr = "197.155.74.246/32"` line is *directly* why you could reach RDS from pgAdmin
> at all — it opens port 5432 to your home IP. If your home IP changes, you'd update this and
> re-apply. See the RDS security-group explanation in §6.3.

`terraform.tfvars` supplies the top-level values:

```hcl
aws_region     = "eu-central-1"
environment    = "dev"
project        = "acocie-stores"
s3_bucket_name = "acocie"
```

Terraform auto-loads any file named `terraform.tfvars`. These flow into `var.aws_region`,
`var.environment`, etc., which then flow down into every module.

---

## 6. Module-by-module deep dive

### 6.1 `modules/s3` — product image storage

Creates the bucket that holds product images, configured for direct browser access:

- `aws_s3_bucket_public_access_block` with everything `false` → *allows* the bucket to be public.
  (By default AWS blocks all public access; you have to explicitly opt out.)
- `aws_s3_bucket_policy` (`PublicReadGetObject`) → grants `s3:GetObject` to `Principal = "*"`
  (anyone). So image URLs work in a browser without signed URLs.
- `depends_on = [aws_s3_bucket_public_access_block...]` → an **explicit ordering hint**. AWS
  rejects a public policy if the access block isn't applied first, and that ordering isn't
  expressible through a normal reference, so you state it manually.
- `cors_configuration` → lets your React frontend fetch images cross-origin.
- `versioning` → keeps old versions if an image is overwritten.
- `server_side_encryption_configuration` (AES256) → encrypts objects at rest.

The outputs (`bucket_name`, `bucket_region`, `bucket_base_url`) are designed to be dropped straight
into your app config as `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_S3_BASE_URL`.

> ⚠️ Public-read on a product bucket is fine for *images*, but it means **anyone who guesses an
> object key can read it**. Never put anything sensitive in this bucket.

### 6.2 `modules/ecr` — the Docker image registry

ECR (Elastic Container Registry) is AWS's private Docker registry. Your CI builds the API image and
pushes it here; ECS pulls from here.

- `aws_ecr_repository "api"` named `acocie-stores/api`, with `scan_on_push = true` → every image is
  automatically scanned for known CVEs.
- `image_tag_mutability = "MUTABLE"` → tags like `dev-latest` can be overwritten (fine for dev;
  the variable's description correctly says use `IMMUTABLE` in prod so a tag always means one exact
  image).
- `aws_ecr_lifecycle_policy` → housekeeping so you don't pay to store hundreds of old images:
  - Rule 1: keep only the last `keep_last_n_images` (10) tagged `dev-*` images.
  - Rule 2: delete untagged images after 7 days.

### 6.3 `modules/vpc` — the network (the most important module to understand)

This builds the private network everything else lives in. Mentally, picture a building:

```
                          Internet
                             │
                    ┌────────┴────────┐
                    │ Internet Gateway│   (front door for public traffic)
                    └────────┬────────┘
        ┌──────────────── VPC 10.0.0.0/16 ────────────────┐
        │                                                  │
        │  PUBLIC subnets (10.0.1.0/24, 10.0.2.0/24)       │
        │     • the ALB lives here                         │
        │     • NAT Gateway lives here                     │
        │            │ (private subnets route out via NAT) │
        │  PRIVATE subnets (10.0.3.0/24, 10.0.4.0/24)      │
        │     • ECS Fargate tasks live here                │
        │     • RDS lives here (logically)                 │
        └──────────────────────────────────────────────────┘
```

Pieces it creates:

- **`aws_vpc`** — your isolated network, CIDR `10.0.0.0/16` (65k addresses). `enable_dns_hostnames`
  is on so RDS gets a DNS name.
- **`aws_internet_gateway`** — the doorway between the VPC and the public internet.
- **Subnets** — note the use of `count` to create *one per availability zone*:
  ```hcl
  resource "aws_subnet" "public" {
    count             = length(var.public_subnet_cidrs)   # makes 2 copies
    cidr_block        = var.public_subnet_cidrs[count.index]
    availability_zone = var.availability_zones[count.index]
    ...
  }
  ```
  `count` + `count.index` is Terraform's way of saying "loop". You get `aws_subnet.public[0]` and
  `aws_subnet.public[1]`, one in each AZ — that's how you get redundancy across data centers.
  Public subnets set `map_public_ip_on_launch = true`; private ones don't.
- **`aws_nat_gateway` + `aws_eip`** — the NAT lets *private* resources (your ECS tasks) make
  *outbound* connections to the internet (e.g. to pull the Docker image, send email, call APIs)
  **without** being reachable *inbound* from the internet. The Elastic IP gives the NAT a stable
  public address. (NAT Gateways cost money hourly — worth knowing for the dev bill.)
- **Route tables** — the "road signs":
  - public route table: `0.0.0.0/0 → internet gateway` (public subnets go straight out).
  - private route table: `0.0.0.0/0 → NAT gateway` (private subnets go out *through* the NAT).
- **Security groups** — these are stateful virtual firewalls. Your three form a clean chain:

  | SG | Inbound allowed from | Purpose |
  |----|----------------------|---------|
  | `alb` | the internet (ports 80, 443) | public entry point |
  | `ecs` | **only the ALB SG**, on port 5002 | tasks only take traffic from the load balancer |
  | `rds` | **only the ECS SG**, on port 5432 (+ optional `admin_cidr`) | DB only reachable by the app |

  This is *least privilege* done well: each layer only accepts traffic from the layer in front of
  it. The clever bit in the RDS SG is the **dynamic block**:

  ```hcl
  dynamic "ingress" {
    for_each = var.admin_cidr != null ? [var.admin_cidr] : []
    content {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }
  ```

  Read it as: "*if* `admin_cidr` is set, add one extra inbound rule allowing Postgres from that IP;
  otherwise add nothing." That conditional rule is what let your laptop reach RDS via pgAdmin. In
  prod you'd leave `admin_cidr` null so the DB is **only** reachable from inside the app.

### 6.4 `modules/rds` — the PostgreSQL database

```hcl
resource "aws_db_instance" "main" {
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = var.instance_class   # db.t3.micro in dev
  manage_master_user_password = true                 # ← the password story from Friday
  storage_encrypted           = true
  multi_az                    = false                 # single AZ in dev to save cost
  publicly_accessible         = var.publicly_accessible
  skip_final_snapshot         = true                  # dev: ok to destroy w/o backup
  deletion_protection         = false                 # dev: allow destroy
}
```

The line you now know well: **`manage_master_user_password = true`**. This tells RDS to *generate*
the master password and store it in **AWS Secrets Manager** automatically, rather than you putting a
password in Terraform (which would land in plaintext in the state file). The secret's ARN is
exported as the `db_secret_arn` output — the exact value you fetched to recover your pgAdmin login.

The comments correctly flag the dev-vs-prod knobs: in prod you'd flip `multi_az = true`,
`skip_final_snapshot = false`, `deletion_protection = true`, and `publicly_accessible = false`.

### 6.5 `modules/alb` — the Application Load Balancer

The public HTTP entry point to your API. Three resources:

- **`aws_lb`** — internet-facing ("`internal = false`"), spread across both public subnets.
- **`aws_lb_target_group`** with **`target_type = "ip"`** — the comment explains why: Fargate tasks
  have IP addresses, not EC2 instance IDs, so the ALB routes to IPs. The **health check** hits
  `/health` every 30s; 2 good checks = healthy, 3 bad = unhealthy and it stops sending traffic.
- **`aws_lb_listener`** on port 80 → forwards to the target group.

> Note: it's HTTP (port 80) only — no HTTPS/443 listener yet. Adding TLS later means an ACM
> certificate + a 443 listener. Good "next step" item.

### 6.6 `modules/ecs` — running the container (the biggest module)

This is where your Docker image actually runs, on **Fargate** (serverless containers — no EC2 hosts
to manage). It has the most moving parts, so here they are grouped:

**Logging**
- `aws_cloudwatch_log_group` `/ecs/acocie-stores-dev`, 7-day retention → where your container's
  stdout/stderr goes. (`docker logs`, but in the cloud.)

**Secrets**
- `aws_secretsmanager_secret "app"` + `..._version` → a JWT/email secret bundle created with
  `REPLACE_ME` placeholders. The crucial detail:
  ```hcl
  lifecycle { ignore_changes = [secret_string] }
  ```
  This means: Terraform creates the secret once, but **after that, never touches its value** — so
  when you fill in the real JWT/email values in the console, a future `terraform apply` won't wipe
  them back to `REPLACE_ME`. (You must set these real values before a task can start.)

**Two IAM roles — this distinction trips up everyone, so read carefully:**

| Role | Who uses it | What it's for |
|------|-------------|---------------|
| **execution role** | the ECS *agent* (the platform, before/around your container) | pull the image from ECR, write logs, **fetch the secrets** to inject |
| **task role** | your *running container's code* | what *your app* is allowed to do — here, read/write the S3 images bucket |

So: the execution role has `secretsmanager:GetSecretValue` (for both the DB secret and the app
secret) + the AWS-managed `AmazonECSTaskExecutionRolePolicy`. The task role has S3
`GetObject/PutObject/DeleteObject` on your bucket. They both "trust" `ecs-tasks.amazonaws.com` via
their `assume_role_policy` — that's what lets ECS assume them.

**The task definition** (`aws_ecs_task_definition`) — the blueprint for a container:
- `requires_compatibilities = ["FARGATE"]`, `network_mode = "awsvpc"`, `cpu = 256` (0.25 vCPU),
  `memory = 512` MB — a tiny, cheap dev sizing.
- `container_definitions` (a `jsonencode(...)` block) describes the container: which image
  (`${ecr_repository_url}:${image_tag}`), which port (5002), and two kinds of config:
  - **`environment`** — plain, non-secret env vars (NODE_ENV, DB_HOST, DB_NAME, AWS_REGION, the S3
    URL, JWT expiry windows, email host, etc.). Note `DB_HOST` is derived with
    `local.db_host = split(":", var.db_endpoint)[0]` — RDS gives `host:5432`, and this strips the
    port off.
  - **`secrets`** — values pulled from Secrets Manager *at container start* and injected as env
    vars, so the secret value never appears in the task definition. The syntax
    `"${var.db_secret_arn}:password::"` means "from that secret, take the `password` JSON key."

**The cluster + service:**
- `aws_ecs_cluster` — a logical grouping for your tasks.
- `aws_ecs_service` — keeps `desired_count = 1` task running, places it in the **private** subnets
  with `assign_public_ip = false` (it reaches the internet via NAT), and registers it with the ALB
  target group. `deployment_minimum_healthy_percent = 50` / `maximum_percent = 200` control how it
  rolls out a new version without downtime.

---

## 7. How the modules wire together

Here's the dependency graph implied by the output→input references in `envs/dev/main.tf`. An arrow
`A → B` means "B consumes an output of A, so Terraform builds A first":

```
        s3 ─────────────┐
                         ├──────────────► ecs
        ecr ─────────────┤                 ▲
                         │                 │
        vpc ──► rds ─────┘                 │
          │                                │
          └──► alb ──────────────────────►─┘
```

- **vpc** is the foundation — almost everything needs its subnets/security groups.
- **rds** needs vpc (subnets + the rds security group).
- **alb** needs vpc (subnets + the alb security group).
- **ecs** is the integrator — it needs vpc (subnets/SG), ecr (image url), s3 (bucket name/arn/url),
  rds (endpoint + secret arn), and alb (target group). That's why it's "Phase 6," built last.

You don't declare this order anywhere. Terraform derives it from the references and builds a
**dependency graph** automatically. (Run `terraform graph` to see it.)

---

## 8. Request flow

Putting the whole stack together, here's what happens when someone calls your API:

```
1. Browser ──HTTP──► ALB DNS name (the `api_url` output)
2. ALB (public subnet, alb-sg allows :80 from internet)
3. ──forwards──► ECS Fargate task (private subnet, ecs-sg allows :5002 FROM the ALB only)
4. Your Node app runs; needs the DB
5. ──:5432──► RDS (rds-sg allows :5432 FROM the ECS task only)
6. App needs to serve/store an image
7. ──uses the task IAM role──► S3 product-images bucket
8. App needs to send email / reach the internet
9. ──outbound via NAT Gateway──► internet (no inbound exposure)
10. Logs ──awslogs driver──► CloudWatch log group
```

Every hop is gated by a security group that only trusts the layer in front of it. That layered,
least-privilege design is the thing to take away.

---

## 9. How secrets work

You have **two** secrets, handled slightly differently — worth understanding both:

| Secret | Created by | Value set by | Injected into the app as |
|--------|-----------|--------------|--------------------------|
| **DB master password** | RDS itself (`manage_master_user_password = true`) | AWS (auto-generated, auto-rotatable) | `DB_PASSWORD`, from `db_secret_arn:password::` |
| **JWT + email secrets** | the ECS module (placeholder `REPLACE_ME`) | **you**, manually in the console/CLI | `JWT_SECRET`, `EMAIL_USER`, ... from `app_secrets_arn` |

The golden rule visible throughout your code: **secrets never live in `.tf` files or the state as
values you typed.** They live in Secrets Manager; Terraform only ever stores *ARNs* (pointers). The
ECS execution role is granted permission to read those ARNs at container-start time.

This is exactly why, on Friday, the password wasn't "in" your Terraform — you had to fetch it from
Secrets Manager. To retrieve it again any time:

```bash
# 1. get the ARN
cd terraform/envs/dev && terraform output -raw db_secret_arn

# 2. read the secret (single-quote the ARN — the '!' confuses zsh)
aws secretsmanager get-secret-value \
  --secret-id '<paste-arn>' \
  --region eu-central-1 \
  --query SecretString --output text
```

---

## 10. The everyday workflow

Always run these **from inside the environment folder** (`terraform/envs/dev`), because that's where
the backend and module wiring live.

| Command | What it does | When you run it |
|---------|--------------|-----------------|
| `terraform init` | Downloads providers, configures the S3 backend, installs modules | First time, or after changing providers/backend/modules |
| `terraform fmt` | Auto-formats your `.tf` files to canonical style | Before committing |
| `terraform validate` | Checks syntax & references without touching AWS | Quick sanity check |
| `terraform plan` | Shows the diff (add/change/destroy) — **changes nothing** | Before every apply; read it carefully |
| `terraform apply` | Executes the plan against AWS | To actually deploy changes |
| `terraform output` | Prints output values (add a name, e.g. `terraform output api_url`) | To grab endpoints/ARNs |
| `terraform destroy` | Tears down everything in this env | When you want to stop paying for dev |
| `terraform show` | Prints current state in readable form | Inspect what exists |
| `terraform state list` | Lists every resource Terraform tracks | Debugging |

**Read every `plan` before `apply`.** The three symbols to watch:
- `+` create  &nbsp;•&nbsp;  `~` change in place  &nbsp;•&nbsp;  `-` destroy  &nbsp;•&nbsp;  `-/+`
  destroy **and** recreate (downtime risk — e.g. changing something immutable on RDS).

A typical change cycle for you:
```bash
cd terraform/envs/dev
# edit a .tf file
terraform fmt
terraform plan      # eyeball the diff
terraform apply     # type 'yes'
```

> 💡 Deploying a **new version of your app** doesn't always need Terraform: you push a new image tag
> to ECR and force a new ECS deployment. Terraform is for changing *infrastructure*, not for every
> code deploy. (If you keep `image_tag = "dev-latest"` and overwrite that tag, you redeploy outside
> Terraform.)

---

## 11. HCL language features (cheat sheet)

Every one of these appears in your code — here's each in one line:

| Feature | Example from your repo | Meaning |
|---------|------------------------|---------|
| **Interpolation** | `"${var.project}-${var.environment}-vpc"` | embed a value inside a string |
| **`var.`** | `var.instance_class` | read an input variable |
| **`module.`** | `module.vpc.public_subnet_ids` | read another module's output |
| **resource refs** | `aws_vpc.main.id` | read an attribute of a resource |
| **`count`** | `count = length(var.public_subnet_cidrs)` | create N copies of a resource |
| **`count.index`** | `var.availability_zones[count.index]` | which copy you're on (0,1,2…) |
| **`local`** | `local.db_host`, `local.container_name` | a named, computed value reused in the file |
| **`dynamic` block** | the optional RDS `ingress` for `admin_cidr` | conditionally generate nested blocks |
| **ternary** | `var.admin_cidr != null ? [var.admin_cidr] : []` | inline if/else |
| **`jsonencode()`** | IAM policies, ECR lifecycle, container defs | turn HCL into a JSON string AWS wants |
| **`split()`** | `split(":", var.db_endpoint)[0]` | string → list, take first element |
| **`length()`** | `length(var.private_subnet_cidrs)` | count items in a list |
| **`tostring()`** | `tostring(var.container_port)` | number → string (env vars must be strings) |
| **splat `[*]`** | `aws_subnet.public[*].id` | collect that attribute from every `count` copy |
| **`depends_on`** | S3 policy depends on access-block | force ordering Terraform can't infer |
| **`lifecycle { ignore_changes }`** | the app secret value | "don't manage this field after creation" |

---

## 12. Gotchas

**1. The `terraform/` root files are legacy and overlap with `modules/s3`.**
`terraform/main.tf` (+ its `providers.tf`/`variables.tf`/`outputs.tf`) is a **flat, standalone
S3-only config** — almost identical to `modules/s3`, but with `environment = "production"` and bucket
`acocie`. This looks like your *original* first attempt before you refactored into the
modules+envs structure. Two risks:
   - Running `terraform apply` from `terraform/` vs from `terraform/envs/dev/` manages the **same
     bucket** in **two different states** → they can fight over it.
   - It's confusing for future-you.

   **Recommendation:** decide which one owns the bucket (almost certainly `envs/dev`), then delete
   the root-level `main.tf/providers.tf/variables.tf/outputs.tf` (or move them to an `legacy/`
   folder) so there's one source of truth. Don't do this casually — check `terraform state list`
   in both locations first so you don't orphan the live bucket.

**2. RDS is `publicly_accessible = true` in dev.** Combined with the `admin_cidr` rule, this is what
makes pgAdmin work — but it means your DB has a public endpoint. It's still firewalled by the
security group to your IP + the ECS tasks, but treat it as dev-only. Prod = `false`, DB in private
subnets, reach it via a bastion/SSM tunnel.

**3. ALB is HTTP-only.** No HTTPS yet. Fine for dev; add ACM + a 443 listener before real traffic.

**4. NAT Gateway costs money 24/7.** It's the main "idle" cost in this stack. If you `terraform
destroy` dev when not using it, that's the big one you stop paying for.

**5. `image_tag = "dev-latest"` is mutable.** Convenient, but "latest" is ambiguous — you can't tell
from the tag which commit is running. For traceability, tag images with the git SHA
(`dev-a1b2c3d`) and set that as `image_tag`.

**6. Don't commit real state or `.tfvars` with secrets.** Your dev state lives safely in S3. Just
make sure `*.tfstate` (except the backend bootstrap one you intentionally keep) and any secret-bearing
files are git-ignored.

---

## 13. Glossary

- **IaC** — Infrastructure as Code. Managing infra by writing files instead of clicking consoles.
- **Provider** — a plugin Terraform uses to talk to an API (you use `hashicorp/aws`).
- **Resource** — one real cloud object (a bucket, a DB, a security group).
- **State** — Terraform's record of what it built; yours lives in S3, locked by DynamoDB.
- **Backend** — *where* state is stored (`s3` backend here).
- **Module** — a reusable folder of `.tf` files, called like a function.
- **Composition root** — the env folder (`envs/dev`) that instantiates modules into a real system.
- **Variable / Output** — a module's inputs / return values.
- **CIDR** — an IP range like `10.0.0.0/16` (`/16` = ~65k addresses, `/32` = exactly one IP).
- **Subnet** — a slice of the VPC's IP range, tied to one availability zone.
- **Security group** — a stateful virtual firewall attached to resources.
- **VPC / IGW / NAT** — your private network / its public door / its outbound-only door for private
  resources.
- **ALB** — Application Load Balancer; the public HTTP entry point.
- **Target group** — the pool of backends (your task IPs) the ALB routes to.
- **ECR** — AWS's private Docker registry.
- **ECS / Fargate** — AWS's container orchestrator / its serverless mode (no servers to manage).
- **Task definition** — the blueprint for a container (image, CPU, env, secrets).
- **Service** — keeps N tasks running and wired to the ALB.
- **Execution role vs Task role** — perms for the ECS *platform* vs perms for *your app code*.
- **Secrets Manager** — AWS service holding secret values; Terraform stores only the ARN.

---

## 14. Exercises

Best way to cement this — try these in order, reading each `plan` carefully:

1. **Read-only:** `cd terraform/envs/dev && terraform plan`. With no changes, it should say
   "No changes." If it *does* show changes, something drifted — investigate before applying.
2. **Trace one variable:** follow `var.project` from `terraform.tfvars` → `envs/dev/main.tf` →
   into `modules/vpc` → into the `Name` tag of the VPC. Confirm the resulting tag value in the AWS
   console.
3. **Safe change:** bump the CloudWatch log retention in `modules/ecs/main.tf` from 7 to 14 days,
   `plan`, and confirm it shows a single `~` in-place change. Apply, verify, revert.
4. **Understand a recreate:** in a scratch branch, change the RDS `engine_version` and `plan` — see
   whether Terraform wants `~` (in place) or `-/+` (destroy+recreate). Do **not** apply; just learn
   to spot destructive plans.
5. **Add HTTPS (stretch):** research adding an `aws_lb_listener` on 443 with an ACM certificate to
   the ALB module. Write it, `plan`, discuss.
6. **Clean up the legacy root config** (gotcha #1) once you're confident which state owns the bucket.

---

*Generated as a learning companion to the Acocie Stores Terraform setup. Everything here is grounded
in the actual files under `terraform/` as of this writing — if you change the infra, revisit the
relevant section.*
