# ── Phase 1 outputs (S3) ──────────────────────────────────────────────────────

output "s3_bucket_name" {
  description = "Product images bucket — set as AWS_S3_BUCKET in your app config"
  value       = module.s3.bucket_name
}

output "s3_bucket_region" {
  description = "Bucket region — set as AWS_REGION in your app config"
  value       = module.s3.bucket_region
}

output "s3_bucket_base_url" {
  description = "Public base URL for images — set as AWS_S3_BASE_URL in your app config"
  value       = module.s3.bucket_base_url
}

# ── Phase 2 outputs (ECR) ─────────────────────────────────────────────────────
output "ecr_repository_url" {
  description = "Full ECR URL (without tag) — used for docker push and ECS task definitions"
  value       = module.ecr.repository_url
}

# ── Phase 3 outputs (VPC) ─────────────────────────────────────────────────────
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (ALB)"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs (ECS + RDS)"
  value       = module.vpc.private_subnet_ids
}

# ── Phase 4 outputs (RDS) ─────────────────────────────────────────────────────
output "db_endpoint" {
  description = "RDS endpoint — used to build DATABASE_URL"
  value       = module.rds.db_endpoint
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for the DB password"
  value       = module.rds.db_secret_arn
}

# ── Phase 5 outputs (ALB) — uncomment after module is wired up ────────────────
# output "api_url" {
#   description = "Public DNS name of the load balancer — your API is reachable here"
#   value       = "http://${module.alb.alb_dns_name}"
# }
