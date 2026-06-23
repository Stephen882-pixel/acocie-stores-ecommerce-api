variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, stage, pre-prod, prod)"
  type        = string
}

variable "project" {
  description = "Project name used for tagging"
  type        = string
  default     = "acocie-stores"
}
