output "bucket_name" {
  description = "The name of the S3 bucket — use as AWS_S3_BUCKET in your env config"
  value       = aws_s3_bucket.product_images.id
}

output "bucket_arn" {
  description = "ARN of the bucket — attach this to IAM policies that need read/write access"
  value       = aws_s3_bucket.product_images.arn
}

output "bucket_region" {
  description = "Region the bucket was created in — use as AWS_REGION in your env config"
  value       = aws_s3_bucket.product_images.region
}

output "bucket_base_url" {
  description = "Public base URL for images — use as AWS_S3_BASE_URL in your env config"
  value       = "https://${aws_s3_bucket.product_images.bucket}.s3.${aws_s3_bucket.product_images.region}.amazonaws.com"
}
