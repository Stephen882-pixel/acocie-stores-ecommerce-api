output "cluster_name" {
  description = "ECS cluster name — use in AWS CLI commands"
  value       = aws_ecs_cluster.main.name
}

output "service_name" {
  description = "ECS service name — use in AWS CLI commands"
  value       = aws_ecs_service.api.name
}

output "app_secrets_arn" {
  description = "Secrets Manager ARN for JWT + email secrets — populate real values before tasks can start"
  value       = aws_secretsmanager_secret.app.arn
}
