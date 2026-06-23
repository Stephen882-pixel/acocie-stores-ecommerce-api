variable "environment" {
  description = "Deployment environment (dev, stage, pre-prod, prod)"
  type        = string
}

variable "project" {
  description = "Project name used for tagging and naming"
  type        = string
  default     = "acocie-stores"
}

variable "vpc_id" {
  description = "ID of the VPC where RDS will be placed"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets for the RDS subnet group"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "Security group ID of the ECS tasks — only they may connect to RDS"
  type        = string
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "acocie_stores"
}

variable "db_username" {
  description = "Master username for RDS"
  type        = string
  default     = "postgres"
}

variable "db_password_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the DB password"
  type        = string
}

variable "instance_class" {
  description = "RDS instance type. Use db.t3.micro for dev, db.t3.small+ for higher envs."
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Storage in GB"
  type        = number
  default     = 20
}
