variable "environment" {
  description = "Deployment environment (dev, stage, pre-prod, prod)"
  type        = string
}

variable "project" {
  description = "Project name used for tagging and naming"
  type        = string
  default     = "acocie-stores"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets where Fargate tasks will run"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "Security group for ECS tasks (created by the VPC module)"
  type        = string
}

variable "alb_target_group_arn" {
  description = "ARN of the ALB target group — service registers task IPs here"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL without the tag"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy (e.g. dev-latest, dev-a1b2c3d)"
  type        = string
  default     = "dev-latest"
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 5002
}

variable "cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of running tasks (1 for dev)"
  type        = number
  default     = 1
}

variable "db_endpoint" {
  description = "RDS endpoint in host:port format — host is extracted with split()"
  type        = string
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
}

variable "db_secret_arn" {
  description = "Secrets Manager ARN for the RDS-managed DB password"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for product images"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket — granted to the task role"
  type        = string
}

variable "s3_base_url" {
  description = "Public base URL for S3 images (e.g. https://bucket.s3.region.amazonaws.com)"
  type        = string
}

variable "frontend_url" {
  description = "Frontend URL for CORS — set to the actual frontend domain in prod"
  type        = string
  default     = "http://localhost:5173"
}

variable "email_host" {
  description = "SMTP host for sending emails"
  type        = string
  default     = "smtp.gmail.com"
}

variable "email_port" {
  description = "SMTP port (465 for SSL, 587 for TLS)"
  type        = string
  default     = "465"
}

variable "email_from" {
  description = "From address shown on outgoing emails"
  type        = string
  default     = "Acocie Stores <noreply@acocie.com>"
}
