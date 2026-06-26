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
  admin_cidr         = "197.155.74.246/32"
}

# ── Phase 4 — RDS ─────────────────────────────────────────────────────────────
module "rds" {
  source                = "../../modules/rds"
  environment           = var.environment
  project               = var.project
  subnet_ids            = module.vpc.public_subnet_ids
  rds_security_group_id = module.vpc.rds_security_group_id
  instance_class        = "db.t3.micro"
  publicly_accessible   = true
}

# ── Phase 5 — ALB ─────────────────────────────────────────────────────────────
module "alb" {
  source                = "../../modules/alb"
  environment           = var.environment
  project               = var.project
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.vpc.alb_security_group_id
}

# ── Phase 6 — ECS ─────────────────────────────────────────────────────────────
module "ecs" {
  source                = "../../modules/ecs"
  environment           = var.environment
  project               = var.project
  aws_region            = var.aws_region
  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = module.vpc.ecs_security_group_id
  alb_target_group_arn  = module.alb.target_group_arn
  ecr_repository_url    = module.ecr.repository_url
  image_tag             = "dev-latest"
  s3_bucket_name        = module.s3.bucket_name
  s3_bucket_arn         = module.s3.bucket_arn
  s3_base_url           = module.s3.bucket_base_url
  db_endpoint           = module.rds.db_endpoint
  db_name               = module.rds.db_name
  db_username           = module.rds.db_username
  db_secret_arn         = module.rds.db_secret_arn
}
