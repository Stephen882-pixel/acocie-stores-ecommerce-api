variable "project" {
  description = "Project name — becomes the ECR repository namespace"
  type        = string
  default     = "acocie-stores"
}

variable "environment" {
  description = "Deployment environment (dev, stage, pre-prod, prod)"
  type        = string
}

variable "image_tag_mutability" {
  description = "Whether image tags can be overwritten. MUTABLE is fine for dev; use IMMUTABLE for prod."
  type        = string
  default     = "MUTABLE"
}

variable "keep_last_n_images" {
  description = "How many tagged images to retain per environment prefix before expiring old ones"
  type        = number
  default     = 10
}
