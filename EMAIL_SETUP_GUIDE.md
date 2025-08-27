# Email Setup Guide for Rewin Admin Panel

## Problem Fixed
The admin panel was not sending invitation emails when creating new users. The system was only logging the invitation details to the console instead of actually sending emails.

## Solution Implemented
1. Added `nodemailer` package for email sending
2. Created `EmailService.js` for handling email operations
3. Updated user creation route to send actual emails
4. Added email configuration to environment variables

## Setup Instructions

### Option 1: Using Gmail (Recommended for Development)

1. **Update your `.env` file** with these variables:
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_APP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@rewin.com
```

2. **Get Gmail App Password:**
   - Go to your Google Account settings
   - Enable 2-Factor Authentication if not already enabled
   - Go to Security → 2-Step Verification → App passwords
   - Generate an app password for "Mail"
   - Use this app password (not your regular Gmail password)

### Option 2: Using Custom SMTP Server

1. **Update your `.env` file** with these variables:
```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@rewin.com
```

2. **Update EmailService.js** to use SMTP configuration:
   - Uncomment the alternative SMTP configuration
   - Comment out the Gmail configuration

## Testing Email Setup

1. **Test email connection:**
   - The server will automatically test the email connection on startup
   - Check the console logs for connection status

2. **Test invitation email:**
   - Create a new user through the admin panel
   - Check the console logs for email sending status
   - Check the recipient's inbox (and spam folder)

## Email Template Features

The invitation emails include:
- Professional HTML formatting
- Clear call-to-action button
- Fallback text link
- Mobile-responsive design
- Security notice about 24-hour expiration

## Troubleshooting

### Common Issues:

1. **"Authentication failed"**
   - Make sure you're using an app password, not your regular password
   - Verify 2FA is enabled on your Google account

2. **"Connection refused"**
   - Check your SMTP settings
   - Verify firewall/network settings

3. **"Email not received"**
   - Check spam/junk folder
   - Verify the recipient email address
   - Check server logs for sending confirmation

### Fallback Behavior:
If email sending fails, the system will:
- Log the error to the console
- Still create the user successfully
- Display the invitation details in the console for manual sending

## Security Notes

- Never commit real email credentials to version control
- Use environment variables for all sensitive configuration
- Consider using dedicated email services (SendGrid, Mailgun) for production
- App passwords are more secure than regular passwords for automated systems

## Production Recommendations

For production deployment:
1. Use a dedicated email service (SendGrid, AWS SES, Mailgun)
2. Set up proper DNS records (SPF, DKIM, DMARC)
3. Use a professional "from" email address
4. Implement email delivery tracking
5. Add email templates for different languages
6. Set up monitoring for email delivery failures
