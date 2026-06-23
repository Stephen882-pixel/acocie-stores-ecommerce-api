# ─────────────────────────────────────────────────────────────────────────────
# Phase 4 — RDS PostgreSQL
# Implemented after the VPC module is complete.
# ─────────────────────────────────────────────────────────────────────────────
#
# Will create:
#   - DB subnet group (spans private subnets from the VPC module)
#   - aws_db_instance (PostgreSQL 16, Multi-AZ disabled for dev to save cost)
#   - DB password read from Secrets Manager at apply time (no plaintext in state)
#   - Automated backups enabled (7-day retention for dev)
