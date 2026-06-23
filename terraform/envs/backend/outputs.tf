output "state_bucket_name" {
  description = "Copy this value into the bucket field of every env's backend.tf"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "ARN of the state bucket — useful if you need to grant CI/CD access"
  value       = aws_s3_bucket.terraform_state.arn
}

output "lock_table_name" {
  description = "Copy this into the dynamodb_table field of every env's backend.tf"
  value       = aws_dynamodb_table.terraform_locks.name
}
