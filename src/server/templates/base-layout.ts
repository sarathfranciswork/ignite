import Handlebars from "handlebars";

const BASE_LAYOUT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f4f7;
      color: #333333;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f4f4f7;
      padding: 24px 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background-color: #2563eb;
      padding: 24px 32px;
      text-align: center;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
    .email-body {
      padding: 32px;
    }
    .email-body h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #1a1a2e;
    }
    .email-body p {
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 16px 0;
      color: #555555;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      margin: 8px 0;
    }
    .email-footer {
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #eeeeee;
    }
    .email-footer p {
      font-size: 12px;
      color: #999999;
      margin: 0 0 8px 0;
    }
    .email-footer a {
      color: #2563eb;
      text-decoration: none;
    }
    .digest-section {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f0f0;
    }
    .digest-section:last-child {
      border-bottom: none;
    }
    .digest-section h3 {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a2e;
      margin: 0 0 12px 0;
    }
    .digest-item {
      padding: 8px 0;
      font-size: 14px;
      color: #555555;
    }
    .digest-item a {
      color: #2563eb;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background-color: #e0e7ff;
      color: #3730a3;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1>{{appName}}</h1>
      </div>
      <div class="email-body">
        {{{content}}}
      </div>
      <div class="email-footer">
        <p>You received this email because of your notification preferences.</p>
        <p><a href="{{appUrl}}/settings/notifications">Manage preferences</a> &middot; <a href="{{appUrl}}">Open {{appName}}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

export const baseLayoutTemplate = Handlebars.compile(BASE_LAYOUT);
