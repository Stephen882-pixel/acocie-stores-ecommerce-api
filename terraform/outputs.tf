output "bucket_name" {
  description = "The name of the S3 bucket — use this as AWS_S3_BUCKET in your .env"
  value       = aws_s3_bucket.product_images.id
}

output "bucket_arn" {
  description = "ARN of the bucket (needed when attaching IAM policies)"
  value       = aws_s3_bucket.product_images.arn
}

output "bucket_region" {
  description = "Region the bucket was created in — use this as AWS_REGION in your .env"
  value       = aws_s3_bucket.product_images.region
}

output "bucket_base_url" {
  description = "Public base URL for images — use this as AWS_S3_BASE_URL in your .env"
  value       = "https://${aws_s3_bucket.product_images.bucket}.s3.${aws_s3_bucket.product_images.region}.amazonaws.com"
}
