output "repository_url" {
  description = "Full ECR URL (without tag) — used by docker push and ECS task definitions"
  value       = aws_ecr_repository.api.repository_url
}

output "repository_arn" {
  description = "ARN of the ECR repository — attach to IAM policies that need push/pull access"
  value       = aws_ecr_repository.api.arn
}

output "registry_id" {
  description = "AWS account ID that owns the registry — needed for docker login"
  value       = aws_ecr_repository.api.registry_id
}
