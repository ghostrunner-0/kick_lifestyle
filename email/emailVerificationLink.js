export const emailVerificationLink = (link) => {
  const html = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Verification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
      font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif;
      color: #212529;
    }

    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
    }

    .header {
      padding: 32px 20px 20px;
      text-align: center;
      background-color: #ffffff;
    }

    .header img {
      max-width: 160px;
      height: auto;
    }

    .title {
      font-size: 26px;
      font-weight: 600;
      margin: 24px 0 10px;
        text-align: center;

    }

    .message {
      font-size: 16px;
      color: #5f6368;
      text-align: center;
      padding: 0 36px;
      line-height: 1.6;
    }

    .button-wrapper {
      text-align: center;
      margin: 36px 0 24px;
    }

    .verify-btn {
      background-color: #fcba17;
      color: #000;
      padding: 14px 36px;
      text-decoration: none;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      display: inline-block;
      transition: background-color 0.3s ease;
    }

    .verify-btn:hover {
      background-color: #e0a913;
    }

    .alt-link {
      font-size: 14px;
      color: #5f6368;
      text-align: center;
      padding: 0 36px 24px;
      word-break: break-word;
    }

    .alt-link a {
      color: #fcba17;
      text-decoration: none;
    }

    .note {
      font-size: 13px;
      color: #868e96;
      text-align: center;
      padding: 0 36px 32px;
    }

    .footer {
      font-size: 12px;
      text-align: center;
      color: #adb5bd;
      padding: 20px;
      border-top: 1px solid #e9ecef;
      background-color: #f9f9f9;
    }

    @media (max-width: 520px) {
      .email-container {
        width: 90% !important;
        margin: 20px auto;
      }

      .message,
      .alt-link,
      .note {
        padding: 0 20px;
      }

      .verify-btn {
        width: 80%;
      }
    }
  </style>
</head>

<body>
  <div class="email-container">
    <div class="header">
      <img src="https://kick.com.np/wp-content/uploads/2024/08/Kick-with-K-1.webp" alt="Kick Logo" />
    </div>

    <h2 class="title" >Verify Your Email</h2>

    <div class="message">
      You recently signed up for Kick. Please confirm your email address by clicking the button below. This helps us verify your identity and secure your account.
    </div>

    <div class="button-wrapper">
      <a href="${link}" class="verify-btn">Verify Email</a>
    </div>

    <div class="alt-link">
      If the button doesn’t work, copy and paste this link into your browser:<br />
      <a href="${link}">${link}</a>
    </div>

    <div class="note">
      <strong>Note:</strong> This link will expire in 1 hour. If you did not create an account, no further action is required.
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} Kick Lifestyle. All rights reserved.
    </div>
  </div>
</body>

</html>
`;

  return html;
};
