variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "signalwave"
}

variable "ses_configuration_set_name" {
  description = "SES Configuration Set name"
  type        = string
  default     = "signalwave-tracking"
}

variable "s3_assets_bucket" {
  description = "S3 bucket for email assets"
  type        = string
  default     = "signalwave-assets"
}

variable "webhook_api_endpoint" {
  description = "API endpoint for SES event webhooks"
  type        = string
  default     = "https://api.signalwave.com/v1/webhooks/ses"
}
