variable "environment" {
  description = "Deployment environment (dev, stage, pre-prod, prod)"
  type        = string
}

variable "project" {
  description = "Project name used for tagging and naming"
  type        = string
  default     = "acocie-stores"
}

variable "subnet_ids" {
  description = "Subnet IDs for the RDS subnet group. Use public subnets when publicly_accessible=true (dev), private subnets otherwise."
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "Security group ID for RDS (created by the VPC module)"
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

variable "publicly_accessible" {
  description = "Give the instance a public endpoint — enable in dev for pgAdmin access, keep false in prod"
  type        = bool
  default     = false
}
