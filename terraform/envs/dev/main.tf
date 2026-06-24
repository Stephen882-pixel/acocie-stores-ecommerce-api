# ─────────────────────────────────────────────────────────────────────────────
# Dev environment — orchestrates all modules for the development environment.
# Uncomment each module block as the corresponding phase is implemented.
# ─────────────────────────────────────────────────────────────────────────────

# Phase 1 — S3 (product images bucket, already provisioned)
module "s3" {
  source = "../../modules/s3"

  bucket_name = var.s3_bucket_name
  environment = var.environment
  project     = var.project
}

# ── Phase 2 — ECR ─────────────────────────────────────────────────────────────
 module "ecr" {
  source      = "../../modules/ecr"
  environment = var.environment
  project     = var.project
}

# ── Phase 3 — VPC ─────────────────────────────────────────────────────────────
module "vpc" {
  source             = "../../modules/vpc"
  environment        = var.environment
  project            = var.project
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
}

# ── Phase 4 — RDS ─────────────────────────────────────────────────────────────
module "rds" {
  source                = "../../modules/rds"
  environment           = var.environment
  project               = var.project
  private_subnet_ids    = module.vpc.private_subnet_ids
  rds_security_group_id = module.vpc.rds_security_group_id
  instance_class        = "db.t3.micro"
}

# ── Phase 5 — ALB ─────────────────────────────────────────────────────────────
# module "alb" {
#   source            = "../../modules/alb"
#   environment       = var.environment
#   project           = var.project
#   vpc_id            = module.vpc.vpc_id
#   public_subnet_ids = module.vpc.public_subnet_ids
# }

# ── Phase 6 — ECS ─────────────────────────────────────────────────────────────
# module "ecs" {
#   source                = "../../modules/ecs"
#   environment           = var.environment
#   project               = var.project
#   aws_region            = var.aws_region
#   vpc_id                = module.vpc.vpc_id
#   private_subnet_ids    = module.vpc.private_subnet_ids
#   alb_target_group_arn  = module.alb.target_group_arn
#   alb_security_group_id = module.alb.alb_security_group_id  # will be added in alb module
#   ecr_repository_url    = module.ecr.repository_url
#   image_tag             = var.image_tag
#   s3_bucket_arn         = module.s3.bucket_arn
#   desired_count         = 1
# }
