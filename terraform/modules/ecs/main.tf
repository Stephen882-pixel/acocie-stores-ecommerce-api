# ─────────────────────────────────────────────────────────────────────────────
# Phase 6 — ECS Cluster + Fargate Service
# Implemented after VPC, RDS, and ALB are complete.
# ─────────────────────────────────────────────────────────────────────────────
#
# Will create:
#   - aws_ecs_cluster
#   - aws_cloudwatch_log_group (for container stdout/stderr)
#   - aws_iam_role — ecsTaskExecutionRole (allows ECS to pull from ECR + read Secrets Manager)
#   - aws_iam_role — ecsTaskRole (allows the running container to access S3)
#   - aws_ecs_task_definition (Fargate, Linux/ARM64, var.cpu / var.memory)
#     · container env vars from var.environment_variables
#     · container secrets from var.secrets_arns → Secrets Manager
#   - aws_ecs_service (desired_count = var.desired_count, rolling update deployment)
#   - aws_security_group for ECS tasks (ingress only from ALB sg, egress open)
