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
  description = "AWS region — needed to build the ECR image URI"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets where Fargate tasks will run"
  type        = list(string)
}

variable "alb_target_group_arn" {
  description = "ARN of the ALB target group to register tasks into"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group of the ALB — ECS allows inbound only from here"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL (without the tag)"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy (e.g. dev-a1b2c3d)"
  type        = string
}

variable "container_port" {
  description = "Port the container exposes"
  type        = number
  default     = 5000
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
  description = "Number of tasks to run (1 for dev, 2+ for prod)"
  type        = number
  default     = 1
}

variable "secrets_arns" {
  description = "Map of env var name to Secrets Manager ARN — injected into the container at runtime"
  type        = map(string)
  default     = {}
}

variable "environment_variables" {
  description = "Non-secret environment variables passed directly to the container"
  type        = map(string)
  default     = {}
}

variable "s3_bucket_arn" {
  description = "ARN of the product images S3 bucket — granted to the task role"
  type        = string
}
