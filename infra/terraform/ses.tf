# ─── SES Configuration Set ────────────────────────────────

resource "aws_sesv2_configuration_set" "tracking" {
  configuration_set_name = var.ses_configuration_set_name

  delivery_options {
    tls_policy = "REQUIRE"
  }

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }

  tracking_options {
    custom_redirect_domain = "" # Set per-domain later
  }
}

# ─── SNS Topic for SES Events ────────────────────────────

resource "aws_sns_topic" "ses_events" {
  name = "${var.project_name}-ses-events-${var.environment}"
}

resource "aws_sns_topic_policy" "ses_events" {
  arn = aws_sns_topic.ses_events.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSESPublish"
        Effect    = "Allow"
        Principal = { Service = "ses.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.ses_events.arn
      }
    ]
  })
}

# Subscribe webhook endpoint to SNS topic
resource "aws_sns_topic_subscription" "ses_webhook" {
  count     = var.enable_sns_webhook ? 1 : 0
  topic_arn = aws_sns_topic.ses_events.arn
  protocol  = "https"
  endpoint  = var.webhook_api_endpoint
}

# ─── SES Configuration Set Event Destination ─────────────

resource "aws_sesv2_configuration_set_event_destination" "sns" {
  configuration_set_name = aws_sesv2_configuration_set.tracking.configuration_set_name
  event_destination_name = "sns-events"

  event_destination {
    enabled              = true
    matching_event_types = [
      "SEND",
      "DELIVERY",
      "BOUNCE",
      "COMPLAINT",
      "OPEN",
      "CLICK",
      "REJECT",
      "RENDERING_FAILURE",
      "DELIVERY_DELAY"
    ]

    sns_destination {
      topic_arn = aws_sns_topic.ses_events.arn
    }
  }
}
