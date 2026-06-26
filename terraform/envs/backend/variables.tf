variable "aws_region" {
  description = "AWS region to create the state bucket and lock table in"
  type        = string
  default     = "eu-central-1"
}

variable "state_bucket_name" {
  description = "Name of the S3 bucket that will store all Terraform state files. Must be globally unique."
  type        = string
  default     = "acocie-stores-terraform-state"
}

variable "lock_table_name" {
  description = "Name of the DynamoDB table used for state locking"
  type        = string
  default     = "acocie-terraform-locks"
}
