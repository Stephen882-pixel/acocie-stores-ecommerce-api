resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.project}-${var.environment}-db-subnet-group"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project}-${var.environment}"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.db_username

  # AWS generates the password and stores it in Secrets Manager automatically.
  # The secret ARN is exported as an output for the ECS task to use at runtime.
  manage_master_user_password = true

  allocated_storage = var.allocated_storage
  storage_type      = "gp2"
  storage_encrypted = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]

  multi_az            = false # disabled for dev — enable in stage/prod
  publicly_accessible = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Safe to destroy without a final snapshot in dev.
  # Set both to true in stage/prod.
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name        = "${var.project}-${var.environment}-db"
    Environment = var.environment
    Project     = var.project
  }
}
