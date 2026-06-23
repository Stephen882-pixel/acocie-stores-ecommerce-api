terraform {
  backend "s3" {
    # These values must match what terraform/envs/backend/ created.
    bucket         = "acocie-stores-terraform-state"
    key            = "envs/dev/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "acocie-terraform-locks"
    encrypt        = true
  }
}
