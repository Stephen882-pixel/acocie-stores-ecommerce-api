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
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "IDs of the public subnets — ALB spans all of them for redundancy"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID for the ALB (created by the VPC module)"
  type        = string
}

variable "container_port" {
  description = "Port the API container listens on (must match EXPOSE in Dockerfile)"
  type        = number
  default     = 5002
}

variable "health_check_path" {
  description = "HTTP path the ALB hits to decide if a container is healthy"
  type        = string
  default     = "/health"
}
