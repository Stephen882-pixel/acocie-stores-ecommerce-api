terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Intentionally uses LOCAL state.
  # This is the bootstrap environment that creates the remote state bucket,
  # so it cannot use that bucket as its own backend — that would be circular.
  # Back up terraform.tfstate in this directory manually or commit it to git.
}

provider "aws" {
  region = var.aws_region
}
