export interface StarterTemplate {
  name: string;
  category: string;
  subject: string;
  previewText: string;
  design: Record<string, unknown>;
}

function makeDesign(bodyRows: Record<string, unknown>[]): Record<string, unknown> {
  return {
    counters: { u_row: bodyRows.length + 1, u_column: bodyRows.length + 2, u_content_text: bodyRows.length + 2, u_content_button: 3, u_content_image: 2, u_content_divider: 2 },
    body: {
      id: 'body',
      rows: bodyRows,
      values: {
        popupPosition: 'center',
        popupWidth: '600px',
        popupHeight: 'auto',
        borderRadius: '10px',
        contentAlign: 'center',
        contentVerticalAlign: 'center',
        contentWidth: '600px',
        fontFamily: { label: 'Arial', value: 'arial,helvetica,sans-serif' },
        textColor: '#333333',
        backgroundColor: '#f4f4f4',
        linkStyle: { body: true, linkColor: '#4f46e5', linkHoverColor: '#3730a3', linkUnderline: true, linkHoverUnderline: true },
        _meta: { htmlID: 'u_body', htmlClassNames: 'u_body' },
      },
    },
  };
}

function headerRow(title: string, bgColor = '#4f46e5'): Record<string, unknown> {
  return {
    id: 'header',
    cells: [1],
    columns: [{
      id: 'header-col',
      contents: [{
        id: 'header-text',
        type: 'text',
        values: {
          containerPadding: '30px 20px',
          anchor: '',
          textAlign: 'center',
          lineHeight: '140%',
          linkStyle: { inherit: true, linkColor: '#ffffff', linkHoverColor: '#ffffff', linkUnderline: false, linkHoverUnderline: false },
          text: `<p style="font-size: 24px; color: #ffffff;"><strong>${title}</strong></p>`,
          _meta: { htmlID: 'u_content_text_header', htmlClassNames: 'u_content_text' },
        },
      }],
      values: { backgroundColor: '', padding: '0px', border: {}, _meta: { htmlID: 'u_column_header', htmlClassNames: 'u_column' } },
    }],
    values: {
      displayCondition: null,
      columns: false,
      backgroundColor: bgColor,
      columnsBackgroundColor: '',
      backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
      padding: '0px',
      anchor: '',
      _meta: { htmlID: 'u_row_header', htmlClassNames: 'u_row' },
    },
  };
}

function contentRow(htmlContent: string): Record<string, unknown> {
  return {
    id: 'content',
    cells: [1],
    columns: [{
      id: 'content-col',
      contents: [{
        id: 'content-text',
        type: 'text',
        values: {
          containerPadding: '20px 30px',
          anchor: '',
          textAlign: 'left',
          lineHeight: '160%',
          linkStyle: { inherit: true },
          text: htmlContent,
          _meta: { htmlID: 'u_content_text_body', htmlClassNames: 'u_content_text' },
        },
      }],
      values: { backgroundColor: '#ffffff', padding: '0px', border: {}, _meta: { htmlID: 'u_column_content', htmlClassNames: 'u_column' } },
    }],
    values: {
      displayCondition: null,
      columns: false,
      backgroundColor: '#ffffff',
      columnsBackgroundColor: '',
      backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
      padding: '0px',
      anchor: '',
      _meta: { htmlID: 'u_row_content', htmlClassNames: 'u_row' },
    },
  };
}

function buttonRow(text: string, href = '#', bgColor = '#4f46e5'): Record<string, unknown> {
  return {
    id: 'button-row',
    cells: [1],
    columns: [{
      id: 'button-col',
      contents: [{
        id: 'button',
        type: 'button',
        values: {
          containerPadding: '10px 30px 30px',
          anchor: '',
          href: { name: 'web', values: { href, target: '_blank' } },
          buttonColors: { color: '#ffffff', backgroundColor: bgColor, hoverColor: '#ffffff', hoverBackgroundColor: '#3730a3' },
          size: { autoWidth: false, width: '100%' },
          textAlign: 'center',
          lineHeight: '120%',
          padding: '14px 28px',
          border: {},
          borderRadius: '6px',
          text: `<strong>${text}</strong>`,
          calculatedWidth: 540,
          calculatedHeight: 44,
          _meta: { htmlID: 'u_content_button', htmlClassNames: 'u_content_button' },
        },
      }],
      values: { backgroundColor: '#ffffff', padding: '0px', border: {}, _meta: { htmlID: 'u_column_button', htmlClassNames: 'u_column' } },
    }],
    values: {
      displayCondition: null,
      columns: false,
      backgroundColor: '#ffffff',
      columnsBackgroundColor: '',
      backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
      padding: '0px',
      anchor: '',
      _meta: { htmlID: 'u_row_button', htmlClassNames: 'u_row' },
    },
  };
}

function footerRow(): Record<string, unknown> {
  return {
    id: 'footer',
    cells: [1],
    columns: [{
      id: 'footer-col',
      contents: [{
        id: 'footer-text',
        type: 'text',
        values: {
          containerPadding: '20px 30px',
          anchor: '',
          textAlign: 'center',
          lineHeight: '150%',
          linkStyle: { inherit: true },
          text: '<p style="font-size: 12px; color: #999999;">You received this email because you subscribed to our mailing list.</p><p style="font-size: 12px; color: #999999;"><a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a></p>',
          _meta: { htmlID: 'u_content_text_footer', htmlClassNames: 'u_content_text' },
        },
      }],
      values: { backgroundColor: '#f8f9fa', padding: '0px', border: { borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#e9ecef' }, _meta: { htmlID: 'u_column_footer', htmlClassNames: 'u_column' } },
    }],
    values: {
      displayCondition: null,
      columns: false,
      backgroundColor: '#f8f9fa',
      columnsBackgroundColor: '',
      backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
      padding: '0px',
      anchor: '',
      _meta: { htmlID: 'u_row_footer', htmlClassNames: 'u_row' },
    },
  };
}

export const starterTemplates: StarterTemplate[] = [
  {
    name: 'Welcome Email',
    category: 'transactional',
    subject: 'Welcome to {{company}}, {{first_name}}!',
    previewText: 'We are thrilled to have you on board.',
    design: makeDesign([
      headerRow('Welcome!'),
      contentRow(
        '<h2 style="color: #333333;">Hi {{first_name}},</h2>' +
        '<p style="color: #666666;">Thank you for joining <strong>{{company}}</strong>! We\'re excited to have you as part of our community.</p>' +
        '<p style="color: #666666;">Here\'s what you can do next to get started:</p>' +
        '<ul style="color: #666666;">' +
        '<li>Complete your profile</li>' +
        '<li>Explore our features</li>' +
        '<li>Connect with the community</li>' +
        '</ul>'
      ),
      buttonRow('Get Started'),
      contentRow('<p style="color: #666666;">If you have any questions, just reply to this email. We\'re here to help!</p><p style="color: #666666;">Cheers,<br>The {{company}} Team</p>'),
      footerRow(),
    ]),
  },
  {
    name: 'Newsletter',
    category: 'newsletter',
    subject: 'This Week\'s Update from {{company}}',
    previewText: 'The latest news and insights delivered to your inbox.',
    design: makeDesign([
      headerRow('Weekly Newsletter', '#1a1a2e'),
      contentRow(
        '<h2 style="color: #333333;">Hello {{first_name}},</h2>' +
        '<p style="color: #666666;">Here\'s your weekly digest of what\'s new and noteworthy.</p>' +
        '<hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">' +
        '<h3 style="color: #333333;">Featured Story</h3>' +
        '<p style="color: #666666;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>' +
        '<hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">' +
        '<h3 style="color: #333333;">Quick Reads</h3>' +
        '<ul style="color: #666666;">' +
        '<li>Industry update: What\'s changing in 2026</li>' +
        '<li>Tips and tricks for power users</li>' +
        '<li>Community spotlight: Meet our top contributors</li>' +
        '</ul>'
      ),
      buttonRow('Read Full Newsletter', '#', '#1a1a2e'),
      footerRow(),
    ]),
  },
  {
    name: 'Product Announcement',
    category: 'announcement',
    subject: 'Introducing Something New from {{company}}',
    previewText: 'We have exciting news to share with you.',
    design: makeDesign([
      headerRow('New Product Launch', '#059669'),
      contentRow(
        '<h2 style="color: #333333;">Hi {{first_name}},</h2>' +
        '<p style="color: #666666;">We\'ve been working hard on something special, and today we\'re thrilled to share it with you.</p>' +
        '<h3 style="color: #059669;">What\'s New?</h3>' +
        '<p style="color: #666666;">Our latest product brings you powerful new capabilities designed to make your workflow faster and more efficient.</p>' +
        '<h3 style="color: #059669;">Key Features</h3>' +
        '<ul style="color: #666666;">' +
        '<li><strong>Feature One</strong> - Description of the feature</li>' +
        '<li><strong>Feature Two</strong> - Description of the feature</li>' +
        '<li><strong>Feature Three</strong> - Description of the feature</li>' +
        '</ul>'
      ),
      buttonRow('Learn More', '#', '#059669'),
      contentRow('<p style="color: #666666;">Thank you for being a valued member of the {{company}} community.</p><p style="color: #666666;">Best,<br>The {{company}} Team</p>'),
      footerRow(),
    ]),
  },
  {
    name: 'Event Invitation',
    category: 'event',
    subject: 'You\'re Invited: Join Us for an Exclusive Event',
    previewText: 'RSVP now to reserve your spot.',
    design: makeDesign([
      headerRow('You\'re Invited!', '#7c3aed'),
      contentRow(
        '<h2 style="color: #333333;">Hi {{first_name}},</h2>' +
        '<p style="color: #666666;">We\'d love for you to join us at our upcoming event.</p>' +
        '<div style="background-color: #f3f0ff; border-radius: 8px; padding: 20px; margin: 15px 0;">' +
        '<p style="color: #7c3aed; margin: 0;"><strong>Event Details</strong></p>' +
        '<p style="color: #666666; margin: 8px 0 0 0;">Date: TBD<br>Time: TBD<br>Location: TBD</p>' +
        '</div>' +
        '<p style="color: #666666;">Spaces are limited, so be sure to RSVP early to secure your spot.</p>'
      ),
      buttonRow('RSVP Now', '#', '#7c3aed'),
      contentRow('<p style="color: #666666;">We look forward to seeing you there!</p><p style="color: #666666;">Warm regards,<br>The {{company}} Team</p>'),
      footerRow(),
    ]),
  },
  {
    name: 'Promotional / Sale',
    category: 'ecommerce',
    subject: 'Limited Time Offer: Save Big at {{company}}!',
    previewText: 'Don\'t miss out on our biggest sale of the season.',
    design: makeDesign([
      headerRow('SPECIAL OFFER', '#dc2626'),
      contentRow(
        '<h2 style="color: #333333; text-align: center;">Hi {{first_name}},</h2>' +
        '<div style="text-align: center; padding: 20px 0;">' +
        '<p style="font-size: 48px; font-weight: bold; color: #dc2626; margin: 0;">25% OFF</p>' +
        '<p style="font-size: 16px; color: #666666; margin: 5px 0;">Everything in store - Limited time only!</p>' +
        '</div>' +
        '<p style="color: #666666; text-align: center;">Use code <strong style="color: #dc2626;">SAVE25</strong> at checkout. Offer ends soon.</p>'
      ),
      buttonRow('Shop Now', '#', '#dc2626'),
      contentRow('<p style="color: #999999; font-size: 12px; text-align: center;">Terms and conditions apply. Cannot be combined with other offers.</p>'),
      footerRow(),
    ]),
  },
  {
    name: 'Abandoned Cart',
    category: 'ecommerce',
    subject: '{{first_name}}, you left something behind!',
    previewText: 'Complete your purchase before items sell out.',
    design: makeDesign([
      headerRow('Don\'t Forget!', '#f59e0b'),
      contentRow(
        '<h2 style="color: #333333;">Hi {{first_name}},</h2>' +
        '<p style="color: #666666;">Looks like you left some items in your cart. Don\'t worry, we saved them for you!</p>' +
        '<div style="background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 15px 0;">' +
        '<p style="color: #92400e; margin: 0;"><strong>Your cart is waiting</strong></p>' +
        '<p style="color: #666666; margin: 8px 0 0 0;">Items in your cart may sell out soon. Complete your purchase today!</p>' +
        '</div>'
      ),
      buttonRow('Complete Purchase', '#', '#f59e0b'),
      contentRow('<p style="color: #666666;">Need help? Just reply to this email and we\'ll assist you.</p><p style="color: #666666;">Best,<br>The {{company}} Team</p>'),
      footerRow(),
    ]),
  },
  {
    name: 'Re-engagement',
    category: 'newsletter',
    subject: 'We miss you, {{first_name}}!',
    previewText: 'It\'s been a while. Here\'s what you\'ve missed.',
    design: makeDesign([
      headerRow('We Miss You!', '#6366f1'),
      contentRow(
        '<h2 style="color: #333333;">Hi {{first_name}},</h2>' +
        '<p style="color: #666666;">It\'s been a while since we\'ve heard from you, and we wanted to check in.</p>' +
        '<p style="color: #666666;">Here\'s what you\'ve missed:</p>' +
        '<ul style="color: #666666;">' +
        '<li>New features and improvements</li>' +
        '<li>Exclusive content and resources</li>' +
        '<li>Community updates and events</li>' +
        '</ul>' +
        '<p style="color: #666666;">We\'d love to have you back. Come see what\'s new!</p>'
      ),
      buttonRow('Come Back', '#', '#6366f1'),
      footerRow(),
    ]),
  },
  {
    name: 'Feedback Request',
    category: 'transactional',
    subject: '{{first_name}}, we\'d love your feedback!',
    previewText: 'Your opinion matters. Help us improve.',
    design: makeDesign([
      headerRow('Your Feedback Matters', '#0891b2'),
      contentRow(
        '<h2 style="color: #333333;">Hi {{first_name}},</h2>' +
        '<p style="color: #666666;">We hope you\'ve been enjoying {{company}}. We\'re always looking for ways to improve, and your feedback is incredibly valuable to us.</p>' +
        '<p style="color: #666666;">Would you take a moment to share your experience? It only takes a couple of minutes.</p>' +
        '<div style="background-color: #ecfeff; border-radius: 8px; padding: 20px; margin: 15px 0; text-align: center;">' +
        '<p style="color: #0891b2; margin: 0; font-size: 16px;"><strong>How would you rate your experience?</strong></p>' +
        '</div>'
      ),
      buttonRow('Share Feedback', '#', '#0891b2'),
      contentRow('<p style="color: #666666;">Thank you for helping us get better!</p><p style="color: #666666;">The {{company}} Team</p>'),
      footerRow(),
    ]),
  },
  {
    name: 'Onboarding Series',
    category: 'saas',
    subject: 'Getting Started with {{company}} - Step 1',
    previewText: 'Your quick-start guide to getting the most out of our platform.',
    design: makeDesign([
      headerRow('Getting Started', '#2563eb'),
      contentRow(
        '<div style="background-color: #eff6ff; border-radius: 8px; padding: 10px 15px; margin-bottom: 15px;">' +
        '<p style="color: #2563eb; margin: 0; font-size: 13px;"><strong>Step 1 of 3</strong> - Setting up your account</p>' +
        '</div>' +
        '<h2 style="color: #333333;">Welcome aboard, {{first_name}}!</h2>' +
        '<p style="color: #666666;">Let\'s get you set up for success. This guide will walk you through the essentials.</p>' +
        '<h3 style="color: #2563eb;">Step 1: Complete Your Profile</h3>' +
        '<p style="color: #666666;">A complete profile helps your team collaborate more effectively. Here\'s what to add:</p>' +
        '<ol style="color: #666666;">' +
        '<li>Add your profile picture</li>' +
        '<li>Set your display name and title</li>' +
        '<li>Configure your notification preferences</li>' +
        '</ol>'
      ),
      buttonRow('Complete Your Profile', '#', '#2563eb'),
      contentRow('<p style="color: #666666;">Need help? Our support team is available 24/7.</p><p style="color: #666666;">The {{company}} Team</p>'),
      footerRow(),
    ]),
  },
  {
    name: 'Holiday / Seasonal',
    category: 'announcement',
    subject: 'Happy Holidays from {{company}}!',
    previewText: 'Season\'s greetings and a special thank you.',
    design: makeDesign([
      headerRow('Happy Holidays!', '#166534'),
      contentRow(
        '<h2 style="color: #333333; text-align: center;">Season\'s Greetings, {{first_name}}!</h2>' +
        '<p style="color: #666666; text-align: center;">As the year comes to a close, we want to take a moment to thank you for being a part of the {{company}} community.</p>' +
        '<div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 15px 0; text-align: center;">' +
        '<p style="color: #166534; font-size: 18px; margin: 0;"><strong>Thank you for an amazing year!</strong></p>' +
        '<p style="color: #666666; margin: 8px 0 0 0;">We\'re grateful for your support and look forward to an even better year ahead.</p>' +
        '</div>' +
        '<p style="color: #666666; text-align: center;">Wishing you joy, peace, and happiness this holiday season.</p>'
      ),
      contentRow('<p style="color: #666666; text-align: center;">With warm wishes,<br>The {{company}} Team</p>'),
      footerRow(),
    ]),
  },
  {
    name: 'Webinar Invitation',
    category: 'event',
    subject: 'Join Our Upcoming Webinar - Register Now',
    previewText: 'Learn from industry experts in this free live session.',
    design: makeDesign([
      headerRow('Live Webinar', '#7c3aed'),
      contentRow(
        '<h2 style="color: #333333;">Hi {{first_name}},</h2>' +
        '<p style="color: #666666;">We\'re hosting a live webinar and would love for you to join us!</p>' +
        '<div style="background-color: #f5f3ff; border: 1px solid #7c3aed; border-radius: 8px; padding: 20px; margin: 15px 0;">' +
        '<p style="color: #7c3aed; margin: 0; font-size: 18px;"><strong>Webinar Title</strong></p>' +
        '<p style="color: #666666; margin: 8px 0 0 0;">Date: TBD<br>Time: TBD<br>Duration: 60 minutes<br>Format: Live with Q&amp;A</p>' +
        '</div>' +
        '<h3 style="color: #333333;">What You\'ll Learn</h3>' +
        '<ul style="color: #666666;">' +
        '<li>Key insight or topic point one</li>' +
        '<li>Key insight or topic point two</li>' +
        '<li>Key insight or topic point three</li>' +
        '</ul>' +
        '<p style="color: #666666;">A recording will be available for registered attendees who can\'t make it live.</p>'
      ),
      buttonRow('Register Now', '#', '#7c3aed'),
      footerRow(),
    ]),
  },
  {
    name: 'Thank You / Receipt',
    category: 'transactional',
    subject: 'Thank you for your purchase, {{first_name}}!',
    previewText: 'Your order confirmation and receipt.',
    design: makeDesign([
      headerRow('Thank You!', '#059669'),
      contentRow(
        '<h2 style="color: #333333;">Hi {{first_name}},</h2>' +
        '<p style="color: #666666;">Thank you for your purchase! Here\'s a summary of your order.</p>' +
        '<div style="background-color: #f0fdf4; border: 1px solid #059669; border-radius: 8px; padding: 20px; margin: 15px 0;">' +
        '<p style="color: #059669; margin: 0;"><strong>Order Confirmed</strong></p>' +
        '<p style="color: #666666; margin: 8px 0 0 0;">Order #: XXXXXX<br>Date: [Order Date]<br>Total: $XX.XX</p>' +
        '</div>' +
        '<p style="color: #666666;">If you have any questions about your order, please don\'t hesitate to reach out.</p>'
      ),
      buttonRow('View Order Details', '#', '#059669'),
      contentRow('<p style="color: #666666;">Thanks for choosing {{company}}!</p><p style="color: #666666;">The {{company}} Team</p>'),
      footerRow(),
    ]),
  },
];
