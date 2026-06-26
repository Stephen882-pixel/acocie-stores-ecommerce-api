variable "aws_region" {
  description = "AWS region for all dev resources"
  type        = string
}

variable "environment" {
  description = "Environment name — used in resource names and tags"
  type        = string
}

variable "project" {
  description = "Project name — used in resource names and tags"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for product images in dev"
  type        = string
}

# ── Phase 2 (ECR) ─────────────────────────────────────────────────────────────
# No extra variables needed — ECR uses project + environment.

# ── Phase 3 (VPC) ─────────────────────────────────────────────────────────────
# variable "availability_zones" { ... }   # will be added when VPC module is wired up

# ── Phase 4 (RDS) ─────────────────────────────────────────────────────────────
# variable "db_password_secret_arn" { ... }

# ── Phase 6 (ECS) ─────────────────────────────────────────────────────────────
# variable "image_tag" { ... }   # will come from CI/CD pipeline
