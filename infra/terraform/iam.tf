# ─── IAM Role for API Server (SES + S3 access) ──────────

resource "aws_iam_user" "api_server" {
  name = "${var.project_name}-api-${var.environment}"
}

resource "aws_iam_access_key" "api_server" {
  user = aws_iam_user.api_server.name
}

# SES sending permissions
resource "aws_iam_user_policy" "ses_send" {
  name = "${var.project_name}-ses-send"
  user = aws_iam_user.api_server.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SESSend"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
          "ses:SendBulkTemplatedEmail"
        ]
        Resource = "*"
      },
      {
        Sid    = "SESManage"
        Effect = "Allow"
        Action = [
          "ses:CreateEmailIdentity",
          "ses:DeleteEmailIdentity",
          "ses:GetEmailIdentity",
          "ses:PutEmailIdentityDkimSigningAttributes",
          "ses:GetAccount",
          "ses:ListEmailIdentities"
        ]
        Resource = "*"
      }
    ]
  })
}

# S3 access for assets
resource "aws_iam_user_policy" "s3_assets" {
  name = "${var.project_name}-s3-assets"
  user = aws_iam_user.api_server.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Assets"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.assets.arn,
          "${aws_s3_bucket.assets.arn}/*"
        ]
      }
    ]
  })
}

# SNS publish (for testing)
resource "aws_iam_user_policy" "sns_access" {
  name = "${var.project_name}-sns-access"
  user = aws_iam_user.api_server.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SNSAccess"
        Effect   = "Allow"
        Action   = ["sns:Subscribe", "sns:Unsubscribe"]
        Resource = aws_sns_topic.ses_events.arn
      }
    ]
  })
}
