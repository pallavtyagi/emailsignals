output "ses_configuration_set_name" {
  value = aws_sesv2_configuration_set.tracking.configuration_set_name
}

output "sns_topic_arn" {
  value = aws_sns_topic.ses_events.arn
}

output "s3_bucket_name" {
  value = aws_s3_bucket.assets.id
}

output "cloudfront_distribution_domain" {
  value = aws_cloudfront_distribution.assets.domain_name
}

output "api_server_access_key_id" {
  value     = aws_iam_access_key.api_server.id
  sensitive = true
}

output "api_server_secret_access_key" {
  value     = aws_iam_access_key.api_server.secret
  sensitive = true
}
