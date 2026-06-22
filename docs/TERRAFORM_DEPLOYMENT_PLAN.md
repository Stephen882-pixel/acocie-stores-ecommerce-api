# Terraform Deployment Plan — Acocie Stores Ecommerce API

> **Audience:** A developer who has been learning Terraform for about a week and wants to deploy this Node.js/Express/PostgreSQL/S3 API to AWS using ECS + ECR + Docker across four environments.

---

## Table of Contents

1. [What Terraform Will Manage](#1-what-terraform-will-manage)
2. [AWS Infrastructure Components](#2-aws-infrastructure-components)
3. [Four-Environment Strategy](#3-four-environment-strategy)
4. [Terraform Project Structure](#4-terraform-project-structure)
5. [Key Variable Differences Per Environment](#5-key-variable-differences-per-environment)
6. [Docker + ECR Workflow](#6-docker--ecr-workflow)
7. [CI/CD Pipeline with GitHub Actions](#7-cicd-pipeline-with-github-actions)
8. [Step-by-Step: Deploy to Dev (First Time)](#8-step-by-step-deploy-to-dev-first-time)
9. [Security Considerations Per Environment](#9-security-considerations-per-environment)
10. [Secrets Management](#10-secrets-management)
11. [Cost Estimate](#11-cost-estimate)

---

## 1. What Terraform Will Manage

Terraform is an **Infrastructure as Code (IaC)** tool. Instead of clicking buttons in the AWS console, you write `.tf` files that describe the infrastructure you want, and Terraform creates/updates/destroys it for you. Every AWS resource below will be declared in Terraform code.

**Why Terraform is a perfect fit for this app:**

| App Component | Without Terraform | With Terraform |
|---|---|---|
| PostgreSQL database | Manually click through RDS wizard | `resource "aws_db_instance"` — repeatable, versioned |
| Docker image storage | Manually create ECR repo | `resource "aws_ecr_repository"` — consistent across all envs |
| Running containers | Manually configure ECS tasks | `resource "aws_ecs_task_definition"` — env vars wired automatically |
| S3 bucket for product images | Create bucket by hand, forget to set policies | `resource "aws_s3_bucket"` — policies, versioning, CORS all in code |
| Load balancer + HTTPS | 10-step wizard, easy to miss a rule | `resource "aws_lb"` + ACM cert — done in one `apply` |
| Secrets (JWT, DB password) | Paste into env var boxes manually | `resource "aws_secretsmanager_secret"` — injected into ECS at runtime |

---

## 2. AWS Infrastructure Components

### 2.1 Networking (VPC)

**Every deployment starts here.** A VPC is your private network on AWS — nothing runs without it.

```
VPC (10.0.0.0/16)
├── Public Subnets (2 AZs)   — ALB lives here, reachable from the internet
│   ├── 10.0.1.0/24  (AZ-a)
│   └── 10.0.2.0/24  (AZ-b)
├── Private Subnets (2 AZs)  — ECS tasks + RDS live here, NOT internet-facing
│   ├── 10.0.10.0/24 (AZ-a)
│   └── 10.0.20.0/24 (AZ-b)
├── Internet Gateway          — lets public subnets reach the internet
└── NAT Gateway (in public)   — lets private subnets make outbound calls (npm, ECR pull)
```

**Terraform resources:**
- `aws_vpc`
- `aws_subnet` (×4)
- `aws_internet_gateway`
- `aws_nat_gateway`
- `aws_eip` (Elastic IP for NAT)
- `aws_route_table` + `aws_route_table_association` (×4)

---

### 2.2 Security Groups

Security groups are firewalls that control which traffic can reach each resource.

| Security Group | Inbound | Outbound |
|---|---|---|
| `alb_sg` | 443 (HTTPS) from 0.0.0.0/0, 80 from 0.0.0.0/0 | All to `ecs_sg` |
| `ecs_sg` | Port 5000 from `alb_sg` only | All (for S3, ECR, email, Secrets Manager) |
| `rds_sg` | Port 5432 from `ecs_sg` only | None |

**Terraform resources:** `aws_security_group`, `aws_security_group_rule`

---

### 2.3 ECR — Elastic Container Registry

This is Docker Hub, but private and inside AWS. You push your built image here; ECS pulls from here.

```hcl
resource "aws_ecr_repository" "api" {
  name                 = "acocie-stores-api-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true   # automatically scans for CVEs
  }
}
```

**One repository per environment** keeps images isolated (dev images never accidentally deployed to prod).

Also provision a **lifecycle policy** to auto-delete old images and control costs:
```hcl
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10 }
      action = { type = "expire" }
    }]
  })
}
```

---

### 2.4 ECS — Elastic Container Service (Fargate)

ECS runs your Docker containers without you managing any servers. Fargate is the "serverless containers" mode — you pay per vCPU/memory used, no EC2 instances to manage.

**Three ECS resources you need:**

#### ECS Cluster
```hcl
resource "aws_ecs_cluster" "main" {
  name = "acocie-stores-${var.environment}"
}
```
A cluster is just a logical grouping — think of it as the "datacenter" that holds your services.

#### ECS Task Definition
This is the blueprint for your container — equivalent to `docker-compose.yml` but for AWS.

```hcl
resource "aws_ecs_task_definition" "api" {
  family                   = "acocie-api-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu      # e.g. 256 for dev, 1024 for prod
  memory                   = var.task_memory   # e.g. 512 for dev, 2048 for prod
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "api"
    image     = "${aws_ecr_repository.api.repository_url}:latest"
    essential = true

    portMappings = [{ containerPort = 5000, protocol = "tcp" }]

    # All env vars come from Secrets Manager — never hardcoded
    secrets = [
      { name = "DB_PASSWORD",         valueFrom = aws_secretsmanager_secret.db_password.arn },
      { name = "JWT_SECRET",          valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
      { name = "JWT_REFRESH_SECRET",  valueFrom = aws_secretsmanager_secret.jwt_refresh_secret.arn },
      { name = "JWT_ACCESS_SECRET",   valueFrom = aws_secretsmanager_secret.jwt_access_secret.arn },
      { name = "EMAIL_PASSWORD",      valueFrom = aws_secretsmanager_secret.email_password.arn },
      { name = "AWS_ACCESS_KEY_ID",   valueFrom = aws_secretsmanager_secret.s3_key_id.arn },
      { name = "AWS_SECRET_ACCESS_KEY", valueFrom = aws_secretsmanager_secret.s3_secret_key.arn },
    ]

    environment = [
      { name = "NODE_ENV",           value = var.environment },
      { name = "PORT",               value = "5000" },
      { name = "DB_HOST",            value = aws_db_instance.postgres.address },
      { name = "DB_PORT",            value = "5432" },
      { name = "DB_NAME",            value = var.db_name },
      { name = "DB_USER",            value = var.db_username },
      { name = "JWT_ACCESS_EXPIRY",  value = var.jwt_access_expiry },
      { name = "JWT_REFRESH_EXPIRY", value = "7d" },
      { name = "EMAIL_HOST",         value = "smtp.gmail.com" },
      { name = "EMAIL_PORT",         value = "465" },
      { name = "EMAIL_USER",         value = var.email_user },
      { name = "EMAIL_FROM",         value = "Acocie Stores <noreply@acocie.com>" },
      { name = "FRONTEND_URL",       value = var.frontend_url },
      { name = "AWS_REGION",         value = var.aws_region },
      { name = "AWS_S3_BUCKET",      value = aws_s3_bucket.product_images.bucket },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/acocie-api-${var.environment}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])
}
```

#### ECS Service
The service keeps N copies of your task running and connects them to the load balancer.

```hcl
resource "aws_ecs_service" "api" {
  name            = "acocie-api-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count   # 1 for dev, 2+ for prod
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false   # stays in private subnet
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 5000
  }
}
```

---

### 2.5 RDS — PostgreSQL Database

This is the managed PostgreSQL that replaces the `db` container in `docker-compose.yml`. Your app uses Sequelize with `pg` driver, PostgreSQL 16 (matching the compose file).

```hcl
resource "aws_db_instance" "postgres" {
  identifier        = "acocie-${var.environment}"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.db_instance_class   # db.t3.micro for dev, db.t3.medium for prod
  allocated_storage = var.db_storage_gb       # 20 for dev, 100 for prod

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result        # generated by Terraform, stored in Secrets Manager

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.db_backup_days   # 1 for dev, 7 for prod
  deletion_protection     = var.environment == "prod" ? true : false
  skip_final_snapshot     = var.environment == "prod" ? false : true
  multi_az                = var.environment == "prod" ? true : false
}
```

**Key point:** The entrypoint.sh in this app runs `sequelize-cli db:migrate` on every container start — so Terraform only needs to create the empty database. Sequelize handles the schema.

---

### 2.6 S3 — Product Image Storage

The app already uses S3 (see `src/config/s3.js`, `src/helpers/s3.helper.js`) for product images. Terraform provisions one bucket per environment.

```hcl
resource "aws_s3_bucket" "product_images" {
  bucket = "acocie-stores-images-${var.environment}-${random_id.suffix.hex}"
}

resource "aws_s3_bucket_cors_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id
  cors_rule {
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = [var.frontend_url]
    allowed_headers = ["*"]
  }
}

# Block all public access — images are served via CloudFront or signed URLs
resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket                  = aws_s3_bucket.product_images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

**Optional but recommended:** Add a CloudFront distribution in front of S3. Set `AWS_S3_BASE_URL` to the CloudFront domain for fast, cached image delivery. The `.env.example` already has `AWS_S3_BASE_URL` as a commented-out variable.

---

### 2.7 ALB — Application Load Balancer

The ALB is the entry point for all HTTP traffic. It:
- Accepts HTTPS on port 443
- Terminates SSL (so your Node app only handles plain HTTP internally)
- Forwards traffic to ECS tasks on port 5000
- Redirects HTTP → HTTPS automatically

```hcl
resource "aws_lb" "main" {
  name               = "acocie-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# HTTP → HTTPS redirect
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect { port = "443", protocol = "HTTPS", status_code = "HTTP_301" }
  }
}
```

---

### 2.8 ACM — SSL Certificate

Provides the HTTPS certificate for the ALB.

```hcl
resource "aws_acm_certificate" "main" {
  domain_name       = var.api_domain   # e.g. api-dev.acocie.com
  validation_method = "DNS"

  lifecycle { create_before_destroy = true }
}
```

---

### 2.9 IAM — Identity and Access Management

ECS needs two IAM roles:

**Execution Role** — used by AWS to START your container (pull image from ECR, write logs to CloudWatch, read secrets from Secrets Manager):
```hcl
resource "aws_iam_role" "ecs_execution" {
  name               = "acocie-ecs-execution-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# Attach AWS-managed policy for ECS basics
resource "aws_iam_role_policy_attachment" "ecs_execution_basic" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Add Secrets Manager access so it can inject your secrets
resource "aws_iam_role_policy" "secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.db_password.arn, /* ... all secret ARNs */]
    }]
  })
}
```

**Task Role** — used by your application CODE while it runs (S3 operations for product images):
```hcl
resource "aws_iam_role" "ecs_task" {
  name               = "acocie-ecs-task-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy" "s3_access" {
  name = "s3-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.product_images.arn,
        "${aws_s3_bucket.product_images.arn}/*"
      ]
    }]
  })
}
```

> **Note:** Once the task role grants S3 access, you can remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the container environment entirely. The AWS SDK automatically uses the task role. This is the secure, production-grade approach.

---

### 2.10 Secrets Manager

Stores all sensitive values. ECS injects them into the container at startup as environment variables.

```hcl
resource "aws_secretsmanager_secret" "db_password" {
  name = "acocie/${var.environment}/db-password"
}
resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}
```

Secrets to create:
- `acocie/{env}/db-password`
- `acocie/{env}/jwt-secret`
- `acocie/{env}/jwt-refresh-secret`
- `acocie/{env}/jwt-access-secret`
- `acocie/{env}/email-password`
- `acocie/{env}/s3-access-key-id` *(remove once using task role)*
- `acocie/{env}/s3-secret-access-key` *(remove once using task role)*

---

### 2.11 CloudWatch Logs

Your Node.js app logs (morgan HTTP logs, console output) go here.

```hcl
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/acocie-api-${var.environment}"
  retention_in_days = var.log_retention_days   # 7 for dev, 90 for prod
}
```

---

### 2.12 Auto Scaling (Prod/Pre-Prod)

Automatically add more ECS tasks when traffic spikes.

```hcl
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_tasks
  min_capacity       = var.min_tasks
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification { predefined_metric_type = "ECSServiceAverageCPUUtilization" }
    target_value = 70.0   # scale out when CPU > 70%
  }
}
```

---

### 2.13 Terraform State Backend (S3 + DynamoDB)

Terraform tracks what it has created in a **state file**. In a team (or CI/CD), this file must live in S3 so everyone shares the same state, and DynamoDB provides locking so two people can't run `apply` at the same time.

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "acocie-terraform-state"
    key            = "environments/${var.environment}/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "acocie-terraform-locks"
    encrypt        = true
  }
}
```

> **One-time setup:** Create the S3 bucket and DynamoDB table manually (or with a separate `bootstrap/` Terraform module) before running any environment's `init`.

---

## 3. Four-Environment Strategy

```
dev ──► stage ──► pre-prod ──► prod
  fast iteration  integration  load-test  live traffic
```

| Concern | dev | stage | pre-prod | prod |
|---|---|---|---|---|
| **Purpose** | Daily feature work | Integration testing | Final validation / load test | Live user traffic |
| **Who deploys** | Developers (auto on push) | Auto on merge to `stage` branch | Manual approval gate | Manual approval gate |
| **Data** | Seed data only | Anonymized prod snapshot | Full prod clone | Real user data |
| **Downtime OK?** | Yes | Yes | No | No |
| **Multi-AZ RDS** | No | No | No | Yes |
| **ECS desired count** | 1 | 1 | 2 | 2+ (auto-scaled) |

---

## 4. Terraform Project Structure

```
terraform/
│
├── bootstrap/                    # One-time: create S3 + DynamoDB for state
│   ├── main.tf
│   └── outputs.tf
│
├── modules/                      # Reusable building blocks (write once, use in all envs)
│   ├── vpc/
│   │   ├── main.tf               # VPC, subnets, IGW, NAT, route tables
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecr/
│   │   ├── main.tf               # ECR repo + lifecycle policy
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecs/
│   │   ├── main.tf               # ECS cluster, task def, service, auto-scaling
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── rds/
│   │   ├── main.tf               # RDS PostgreSQL, subnet group, parameter group
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── alb/
│   │   ├── main.tf               # ALB, target group, listeners
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── s3/
│   │   ├── main.tf               # S3 bucket for product images + CORS
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── iam/
│   │   ├── main.tf               # ECS execution role, task role
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── secrets/
│       ├── main.tf               # Secrets Manager secrets
│       ├── variables.tf
│       └── outputs.tf
│
├── environments/
│   ├── dev/
│   │   ├── main.tf               # Calls modules with dev-specific values
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars      # Dev values (committed — no secrets here!)
│   ├── stage/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   ├── pre-prod/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars
│
├── versions.tf                   # Required Terraform + provider versions
└── .terraform.lock.hcl           # Lock file (commit this)
```

### versions.tf (root)
```hcl
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
```

### environments/dev/terraform.tfvars
```hcl
# --- Non-sensitive values only. Secrets go into AWS Secrets Manager. ---
environment       = "dev"
aws_region        = "eu-central-1"
api_domain        = "api-dev.acocie.com"
frontend_url      = "http://localhost:3001"

# ECS
task_cpu          = 256
task_memory       = 512
desired_count     = 1
min_tasks         = 1
max_tasks         = 2

# RDS
db_instance_class = "db.t3.micro"
db_storage_gb     = 20
db_name           = "acocie_stores_dev"
db_username       = "acocie_dev"
db_backup_days    = 1

# Logging
log_retention_days = 7

# JWT
jwt_access_expiry  = "60m"
```

### environments/dev/main.tf
```hcl
provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source      = "../../modules/vpc"
  environment = var.environment
  cidr_block  = "10.0.0.0/16"
}

module "ecr" {
  source      = "../../modules/ecr"
  environment = var.environment
}

module "secrets" {
  source      = "../../modules/secrets"
  environment = var.environment
  db_password = module.rds.db_password
}

module "iam" {
  source      = "../../modules/iam"
  environment = var.environment
  secret_arns = module.secrets.all_secret_arns
  s3_bucket_arn = module.s3.bucket_arn
}

module "rds" {
  source            = "../../modules/rds"
  environment       = var.environment
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.vpc.rds_sg_id
  instance_class    = var.db_instance_class
  allocated_storage = var.db_storage_gb
  db_name           = var.db_name
  db_username       = var.db_username
  backup_days       = var.db_backup_days
}

module "s3" {
  source       = "../../modules/s3"
  environment  = var.environment
  frontend_url = var.frontend_url
}

module "alb" {
  source            = "../../modules/alb"
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.vpc.alb_sg_id
  certificate_arn   = aws_acm_certificate.main.arn
}

module "ecs" {
  source               = "../../modules/ecs"
  environment          = var.environment
  ecr_image_url        = "${module.ecr.repository_url}:latest"
  task_cpu             = var.task_cpu
  task_memory          = var.task_memory
  desired_count        = var.desired_count
  execution_role_arn   = module.iam.execution_role_arn
  task_role_arn        = module.iam.task_role_arn
  private_subnet_ids   = module.vpc.private_subnet_ids
  ecs_security_group   = module.vpc.ecs_sg_id
  target_group_arn     = module.alb.target_group_arn
  db_host              = module.rds.db_host
  db_name              = var.db_name
  db_username          = var.db_username
  s3_bucket            = module.s3.bucket_name
  aws_region           = var.aws_region
  frontend_url         = var.frontend_url
  jwt_access_expiry    = var.jwt_access_expiry
  secrets              = module.secrets.secret_map
  log_retention_days   = var.log_retention_days
}
```

---

## 5. Key Variable Differences Per Environment

| Variable | dev | stage | pre-prod | prod |
|---|---|---|---|---|
| `task_cpu` | 256 (0.25 vCPU) | 512 | 1024 | 2048 |
| `task_memory` | 512 MB | 1024 MB | 2048 MB | 4096 MB |
| `desired_count` | 1 | 1 | 2 | 2 |
| `min_tasks` | 1 | 1 | 2 | 2 |
| `max_tasks` | 2 | 2 | 4 | 10 |
| `db_instance_class` | db.t3.micro | db.t3.small | db.t3.medium | db.t3.large |
| `db_storage_gb` | 20 | 20 | 50 | 100 |
| `db_backup_days` | 1 | 3 | 7 | 7 |
| `multi_az` | false | false | false | true |
| `deletion_protection` | false | false | true | true |
| `log_retention_days` | 7 | 14 | 30 | 90 |
| `jwt_access_expiry` | 60m | 30m | 15m | 15m |
| `api_domain` | api-dev.acocie.com | api-stage.acocie.com | api-preprod.acocie.com | api.acocie.com |

---

## 6. Docker + ECR Workflow

### How it works

```
Your machine                AWS
   │                         │
   │  docker build           │
   │──────────────► image    │
   │                  │      │
   │  docker push     │      │
   │─────────────────►│ ECR  │
   │                  │      │
   │                  │      │  ECS pulls on deploy
   │                  └─────►│ ECS Task
```

### Build, Tag, and Push Commands

```bash
# 1. Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="eu-central-1"
ENVIRONMENT="dev"

# 2. Log Docker into ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 3. Build the image (uses the multi-stage Dockerfile in the repo)
docker build -t acocie-stores-api-$ENVIRONMENT .

# 4. Tag it with the ECR URL
ECR_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/acocie-stores-api-$ENVIRONMENT"
docker tag acocie-stores-api-$ENVIRONMENT:latest $ECR_URL:latest

# 5. Also tag with the git commit SHA for traceability
GIT_SHA=$(git rev-parse --short HEAD)
docker tag acocie-stores-api-$ENVIRONMENT:latest $ECR_URL:$GIT_SHA

# 6. Push both tags
docker push $ECR_URL:latest
docker push $ECR_URL:$GIT_SHA

# 7. Force ECS to deploy the new image
aws ecs update-service \
  --cluster acocie-stores-$ENVIRONMENT \
  --service acocie-api-$ENVIRONMENT \
  --force-new-deployment
```

---

## 7. CI/CD Pipeline with GitHub Actions

Create `.github/workflows/` with separate files per concern.

### Branch → Environment Mapping

| Git branch | Deploys to |
|---|---|
| `develop` | dev |
| `stage` | stage |
| `pre-prod` | pre-prod |
| `main` | prod |

### `.github/workflows/deploy-dev.yml`

```yaml
name: Deploy to Dev

on:
  push:
    branches: [develop]

env:
  AWS_REGION: eu-central-1
  ENVIRONMENT: dev
  ECR_REPOSITORY: acocie-stores-api-dev
  ECS_CLUSTER: acocie-stores-dev
  ECS_SERVICE: acocie-api-dev

jobs:
  terraform-plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Terraform Init
        working-directory: terraform/environments/dev
        run: terraform init

      - name: Terraform Plan
        working-directory: terraform/environments/dev
        run: terraform plan -out=tfplan

  deploy:
    name: Build, Push, Deploy
    runs-on: ubuntu-latest
    needs: terraform-plan

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, Tag, Push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Terraform Apply
        working-directory: terraform/environments/dev
        run: terraform apply -auto-approve

      - name: Force ECS Deployment
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --force-new-deployment

      - name: Wait for ECS Service Stability
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_SERVICE
```

### PR Check (runs on all PRs, no deploy)
```yaml
# .github/workflows/pr-check.yml
name: PR Check

on:
  pull_request:
    branches: [develop, stage, pre-prod, main]

jobs:
  terraform-validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, stage, pre-prod, prod]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Terraform Init + Validate
        working-directory: terraform/environments/${{ matrix.environment }}
        run: |
          terraform init -backend=false
          terraform validate
          terraform fmt -check
```

### Prod Deploy (manual approval required)
```yaml
# .github/workflows/deploy-prod.yml
name: Deploy to Prod

on:
  push:
    branches: [main]

jobs:
  deploy:
    environment: production   # ← GitHub "environment" with required reviewers
    runs-on: ubuntu-latest
    steps:
      # ... same steps as dev but ENVIRONMENT=prod
      # The "environment: production" line adds a manual approval gate in GitHub UI
```

---

## 8. Step-by-Step: Deploy to Dev (First Time)

### Prerequisites

```bash
# Install Terraform (Linux)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install Docker (already likely installed)
docker --version
```

### Step 1 — Configure AWS Credentials

```bash
aws configure
# AWS Access Key ID: <your key>
# AWS Secret Access Key: <your secret>
# Default region name: eu-central-1
# Default output format: json
```

### Step 2 — Bootstrap: Create State Backend (one time ever)

```bash
cd terraform/bootstrap
terraform init
terraform apply
# This creates:
# - S3 bucket: acocie-terraform-state
# - DynamoDB table: acocie-terraform-locks
```

### Step 3 — Initialize the Dev Environment

```bash
cd terraform/environments/dev
terraform init
# Terraform downloads the AWS provider and configures the S3 backend
```

### Step 4 — Preview What Terraform Will Create

```bash
terraform plan
# Read the output carefully. It shows every resource Terraform will create.
# Look for:  Plan: X to add, 0 to change, 0 to destroy
```

### Step 5 — Apply (Create the Infrastructure)

```bash
terraform apply
# Type "yes" when prompted.
# This takes 5-15 minutes (RDS takes the longest).
```

### Step 6 — Note the Outputs

After apply, Terraform prints outputs like:
```
alb_dns_name = "acocie-alb-dev-123456.eu-central-1.elb.amazonaws.com"
ecr_url      = "123456789.dkr.ecr.eu-central-1.amazonaws.com/acocie-stores-api-dev"
rds_endpoint = "acocie-dev.xyz.eu-central-1.rds.amazonaws.com"
```

### Step 7 — Build and Push the Docker Image

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="$AWS_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com/acocie-stores-api-dev"

# Login
aws ecr get-login-password --region eu-central-1 | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com

# Build and push
docker build -t $ECR_URL:latest .
docker push $ECR_URL:latest
```

### Step 8 — Deploy to ECS

```bash
aws ecs update-service \
  --cluster acocie-stores-dev \
  --service acocie-api-dev \
  --force-new-deployment

# Watch the deployment
aws ecs wait services-stable \
  --cluster acocie-stores-dev \
  --services acocie-api-dev
```

### Step 9 — Verify

```bash
# Get the ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Hit the health endpoint
curl http://$ALB_DNS/health
# Should return 200

# Check logs
aws logs tail /ecs/acocie-api-dev --follow
```

---

## 9. Security Considerations Per Environment

### Dev
- Security groups can allow port 5432 (RDS) from your IP for direct DB access during debugging
- Can use HTTP (no HTTPS) to save ACM setup time
- Shorter JWT expiry not critical
- No WAF needed

### Stage
- Close to prod security but relaxed CORS (allow localhost frontends)
- HTTPS required (test the full flow)
- No public RDS access
- Basic CloudWatch alarms

### Pre-Prod
- Identical security to prod
- WAF enabled for load testing (prevents accidental rate limit blocks)
- All secrets via Secrets Manager (no env var overrides)
- Penetration testing done here

### Prod
```hcl
# Strict security group — no SSH, no direct DB access
resource "aws_security_group_rule" "rds_from_ecs_only" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs.id
  security_group_id        = aws_security_group.rds.id
}

# Enable RDS deletion protection
deletion_protection = true

# Enable S3 versioning for product images
resource "aws_s3_bucket_versioning" "product_images" {
  bucket = aws_s3_bucket.product_images.id
  versioning_configuration { status = "Enabled" }
}

# CloudTrail for audit logging
resource "aws_cloudtrail" "main" {
  name                          = "acocie-prod-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
}
```

---

## 10. Secrets Management

**The rule:** Nothing sensitive ever lives in a `.tf` file or `terraform.tfvars`. The flow is:

```
terraform apply
    │
    ├─► generates random DB password  (random_password resource)
    ├─► stores it in Secrets Manager  (aws_secretsmanager_secret_version)
    └─► ECS task definition references the secret ARN
              │
              └─► At container startup, AWS injects the value as an env var
                        │
                        └─► Your app reads process.env.DB_PASSWORD  ✓
```

**For secrets that can't be auto-generated** (like `JWT_SECRET`, `EMAIL_PASSWORD`), use `terraform.tfvars` with `sensitive = true` variables, or better: populate Secrets Manager manually once, then just reference the ARN in Terraform.

```bash
# Manually seed a secret (run once)
aws secretsmanager create-secret \
  --name "acocie/dev/jwt-secret" \
  --secret-string "$(openssl rand -base64 32)"
```

---

## 11. Cost Estimate

| Resource | dev/month (USD) | prod/month (USD) |
|---|---|---|
| ECS Fargate (0.25 vCPU / 0.5 GB, 1 task) | ~$5 | ~$80 (2 tasks, larger) |
| RDS db.t3.micro PostgreSQL | ~$15 | ~$60 (db.t3.large, multi-AZ) |
| ALB | ~$16 | ~$16 |
| NAT Gateway | ~$30 | ~$30 |
| S3 (product images, small) | ~$1 | ~$5 |
| Secrets Manager (~7 secrets) | ~$3 | ~$3 |
| CloudWatch Logs | ~$1 | ~$5 |
| ECR storage | ~$1 | ~$1 |
| **Total** | **~$72** | **~$200** |

> **Tip for learning:** Run dev only during working hours. Use `terraform destroy` at end of day and `terraform apply` in the morning. You can cut dev costs to ~$20/month this way (S3, ECR, and the state bucket are the only always-on costs).

---

## Next Steps

1. **Start with bootstrap** — create the state S3 bucket first
2. **Write the VPC module** — this is the foundation everything else depends on
3. **Write ECR** — simple module, great for practice
4. **Write RDS** — the most config-heavy; take your time with subnet groups and security groups
5. **Write ECS** — wire everything together; the task definition JSON is the tricky part
6. **Add ALB** — then you have a working URL
7. **Add CI/CD** — automate it so deploys happen on `git push`
8. **Add stage/pre-prod/prod** — copy dev, adjust `terraform.tfvars`

Good luck, Stephen! Terraform has a learning curve but once you see `Apply complete! Resources: 42 added` for the first time it's very satisfying.
