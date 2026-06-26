locals {
  # db_endpoint is "hostname:5432" — strip the port for the DB_HOST env var
  db_host        = split(":", var.db_endpoint)[0]
  container_name = "${var.project}-api"
}

# ── CloudWatch log group ───────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project}-${var.environment}"
  retention_in_days = 7

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

# ── App secrets (JWT + email) ──────────────────────────────────────────────────
# Created with placeholder values. Populate real values via AWS console or CLI
# before the first ECS task can start. Re-applies will not overwrite your values.

resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.project}/${var.environment}/app-secrets"
  recovery_window_in_days = 0 # allow immediate deletion in dev (no 30-day recovery window)

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    JWT_SECRET         = "REPLACE_ME"
    JWT_REFRESH_SECRET = "REPLACE_ME"
    JWT_ACCESS_SECRET  = "REPLACE_ME"
    EMAIL_USER         = "REPLACE_ME"
    EMAIL_PASSWORD     = "REPLACE_ME"
  })

  lifecycle {
    # Terraform created the initial values — don't overwrite user-set secrets on re-apply
    ignore_changes = [secret_string]
  }
}

# ── IAM: task execution role ───────────────────────────────────────────────────
# Used by the ECS AGENT to: pull image from ECR, write logs, inject secrets.

resource "aws_iam_role" "execution" {
  name = "${var.project}-${var.environment}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "execution_secrets" {
  name = "${var.project}-${var.environment}-ecs-execution-secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [var.db_secret_arn, aws_secretsmanager_secret.app.arn]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution_secrets" {
  role       = aws_iam_role.execution.name
  policy_arn = aws_iam_policy.execution_secrets.arn
}

# ── IAM: task role ─────────────────────────────────────────────────────────────
# Used by the RUNNING CONTAINER to call AWS APIs (S3 in this case).

resource "aws_iam_role" "task" {
  name = "${var.project}-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_iam_policy" "task_s3" {
  name = "${var.project}-${var.environment}-ecs-task-s3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = "${var.s3_bucket_arn}/*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_s3" {
  role       = aws_iam_role.task.name
  policy_arn = aws_iam_policy.task_s3.arn
}

# ── ECS cluster ────────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

# ── ECS task definition ────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project}-${var.environment}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = local.container_name
    image     = "${var.ecr_repository_url}:${var.image_tag}"
    essential = true

    portMappings = [{
      containerPort = var.container_port
      hostPort      = var.container_port
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = tostring(var.container_port) },
      { name = "DB_HOST", value = local.db_host },
      { name = "DB_PORT", value = "5432" },
      { name = "DB_NAME", value = var.db_name },
      { name = "DB_USER", value = var.db_username },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "AWS_S3_BUCKET", value = var.s3_bucket_name },
      { name = "AWS_S3_BASE_URL", value = var.s3_base_url },
      { name = "FRONTEND_URL", value = var.frontend_url },
      { name = "JWT_ACCESS_EXPIRY", value = "60m" },
      { name = "JWT_REFRESH_EXPIRY", value = "7d" },
      { name = "EMAIL_HOST", value = var.email_host },
      { name = "EMAIL_PORT", value = var.email_port },
      { name = "EMAIL_FROM", value = var.email_from },
    ]

    secrets = [
      # DB password — AWS generates and rotates this via RDS managed secret
      { name = "DB_PASSWORD", valueFrom = "${var.db_secret_arn}:password::" },
      # App secrets — you must set real values in Secrets Manager before tasks start
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_SECRET::" },
      { name = "JWT_REFRESH_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_REFRESH_SECRET::" },
      { name = "JWT_ACCESS_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_ACCESS_SECRET::" },
      { name = "EMAIL_USER", valueFrom = "${aws_secretsmanager_secret.app.arn}:EMAIL_USER::" },
      { name = "EMAIL_PASSWORD", valueFrom = "${aws_secretsmanager_secret.app.arn}:EMAIL_PASSWORD::" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

# ── ECS service ────────────────────────────────────────────────────────────────

resource "aws_ecs_service" "api" {
  name            = "${var.project}-${var.environment}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = local.container_name
    container_port   = var.container_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}
