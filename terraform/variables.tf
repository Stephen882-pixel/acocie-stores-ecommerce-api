variable "aws_region" {
  description = "AWS region where the S3 bucket will be created"
  type        = string
  default     = "eu-central-1"
}

variable "bucket_name" {
  description = "Name of the S3 bucket for storing product images"
  type        = string
  default     = "acocie"
}

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  default     = "production"
}
