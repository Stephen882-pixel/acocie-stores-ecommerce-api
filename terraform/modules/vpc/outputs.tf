output "vpc_id" {
  description = "VPC ID — passed to every other module"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets — ALB is placed here"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets — ECS tasks and RDS are placed here"
  value       = aws_subnet.private[*].id
}

output "alb_security_group_id" {
  description = "Security group for the ALB — referenced by ECS module"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "Security group for ECS tasks — referenced by RDS module"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "Security group for RDS — allows PostgreSQL from ECS only"
  value       = aws_security_group.rds.id
}
