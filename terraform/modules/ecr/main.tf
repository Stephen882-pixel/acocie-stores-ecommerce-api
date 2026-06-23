resource "aws_ecr_repository" "api" {
  name                 = "${var.project}/api"
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    # Automatically scans every pushed image for known OS/library CVEs.
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the last ${var.keep_last_n_images} images tagged for this environment"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["${var.environment}-"]
          countType     = "imageCountMoreThan"
          countNumber   = var.keep_last_n_images
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 7 days to keep the repo clean"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
