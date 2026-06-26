output "alb_dns_name" {
  description = "Public DNS name of the ALB — API is reachable at http://<this value>"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.main.arn
}

output "target_group_arn" {
  description = "ARN of the target group — ECS service registers task IPs here"
  value       = aws_lb_target_group.api.arn
}

output "alb_security_group_id" {
  description = "Security group ID of the ALB — ECS module needs this to allow inbound from ALB only"
  value       = var.alb_security_group_id
}
