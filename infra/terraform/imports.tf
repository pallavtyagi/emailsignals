# Import existing resources that were created before Terraform
# These blocks can be removed after the first successful apply

import {
  to = aws_s3_bucket.assets
  id = "signalwave-assets-staging"
}

import {
  to = aws_sesv2_configuration_set.tracking
  id = "signalwave-tracking"
}
