# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — Application Load Balancer
# Implemented after VPC is complete.
# ─────────────────────────────────────────────────────────────────────────────
#
# Will create:
#   - aws_lb (internet-facing, placed in public subnets)
#   - aws_lb_listener on port 80 (HTTP → forward to target group)
#   - aws_lb_target_group for ECS tasks (health check on var.health_check_path)
#
# HTTPS (port 443) will be added once a domain and ACM certificate exist.
