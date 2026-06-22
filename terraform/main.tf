# ─────────────────────────────────────────────
# S3 Bucket — Acocie Stores product images
# ─────────────────────────────────────────────

resource "aws_s3_bucket" "product_images" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Environment = var.environment
    Project     = "acocie-stores"
    ManagedBy   = "terraform"
  }
}

# ─────────────────────────────────────────────
# Allow public read — required so image URLs
# returned by the API are directly accessible
# in a browser without signed URLs.
# ─────────────────────────────────────────────

resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.product_images.id

  # Must wait for the public-access-block to be applied first,
  # otherwise AWS rejects the public bucket policy.
  depends_on = [aws_s3_bucket_public_access_block.product_images]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.product_images.arn}/*"
      }
    ]
  })
}

# ─────────────────────────────────────────────
# CORS — lets the React frontend (and any
# browser) fetch images directly from S3.
# ─────────────────────────────────────────────

resource "aws_s3_bucket_cors_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ─────────────────────────────────────────────
# Versioning — keeps previous versions of an
# image if it gets overwritten accidentally.
# ─────────────────────────────────────────────

resource "aws_s3_bucket_versioning" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ─────────────────────────────────────────────
# Server-side encryption — all objects at rest
# are encrypted with AES-256 automatically.
# ─────────────────────────────────────────────

resource "aws_s3_bucket_server_side_encryption_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
