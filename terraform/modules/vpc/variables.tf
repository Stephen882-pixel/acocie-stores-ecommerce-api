variable "environment" {
  description = "Deployment environment (dev, stage, pre-prod, prod)"
  type        = string
}

variable "project" {
  description = "Project name used for tagging and naming"
  type        = string
  default     = "acocie-stores"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets (one per AZ — ALB lives here)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets (one per AZ — ECS + RDS live here)"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

variable "availability_zones" {
  description = "AZs to deploy subnets into. Must match the number of subnet CIDRs above."
  type        = list(string)
}

variable "app_port" {
  description = "Port the application container listens on"
  type        = number
  default     = 5002
}

variable "admin_cidr" {
  description = "Your IP in CIDR notation (e.g. 1.2.3.4/32) — allows pgAdmin access to RDS from your machine. Dev only."
  type        = string
  default     = null
}
