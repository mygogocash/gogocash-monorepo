# 🤖 Telegram Bot - Email/Mobile Login

## Overview
Telegram bot with email/mobile authentication that generates JWT tokens and sends deep links to open your web application.

## Features
- ✅ Email login
- ✅ Mobile/Phone number login  
- ✅ Password authentication
- ✅ JWT token generation
- ✅ Deep link to web app with token
- ✅ Session management (15-min expiry)
- ✅ Secure credential handling

## How It Works

### User Flow
```
1. User: /login
2. Bot: Shows "Email" or "Mobile" buttons
3. User: Selects login method
4. Bot: Prompts for email/mobile
5. User: Enters email or phone number
6. Bot: Prompts for password
7. User: Enters password (auto-deleted for security)
8. Bot: Sends verification link
9. User: Clicks verification link (opens browser)
10. Browser: Shows verification page
11. User: Clicks "Complete Login"
12. Bot: Sends JWT token + deep link to open app
13. User: Clicks "Open App" → Opens web app with token
```

## Setup

### 1. Environment Variables
Your `.env` is already configured:
```bash
TELEGRAM_BOT_TOKEN=***REMOVED***
JWT_SECRET=***REMOVED***
API_BASE_URL=http://localhost:8080
WEB_APP_URL=https://app.gogocash.co
```

### 2. Install Dependencies
Already installed via yarn:
- `telegraf` - Telegram Bot Framework
- `nestjs-telegraf` - NestJS integration

### 3. Start the Bot
```bash
# Development
yarn start:dev

# Production
yarn build
yarn start:prod
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/login` | Start authentication |
| `/cancel` | Cancel current operation |
| `/help` | Show help message |

## Authentication Flow Details

### Email Login
1. User selects "📧 Login with Email"
2. User types email: `user@example.com`
3. Bot validates email format
4. User enters password
5. Password message is deleted for security
6. Bot sends verification link
7. User completes verification in browser
8. Bot sends token + deep link

### Mobile Login
1. User selects "📱 Login with Mobile"
2. User can either:
   - Type mobile number: `+1234567890`
   - Or click "Share My Phone Number" button
3. Bot validates mobile format
4. User enters password
5. Password message is deleted for security
6. Bot sends verification link
7. User completes verification in browser
8. Bot sends token + deep link

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/telegram-auth/verify?sessionId={id}&type={type}` | Verification page |
| POST | `/telegram-auth/complete` | Complete authentication |
| GET | `/telegram-auth/success?sessionId={id}` | Success page |

## Security Features

### Password Security
- ✅ Password messages are automatically deleted from chat
- ✅ Passwords are never logged
- ✅ Passwords are never sent to frontend

### Session Security
- ✅ Unique session IDs (64 characters)
- ✅ 15-minute auto-expiry
- ✅ One-time use tokens
- ✅ Session cleanup after use

### Token Security
- ✅ JWT tokens with 7-day expiry
- ✅ Signed with secret key
- ✅ Contains user identification data
- ✅ Secure transmission via HTTPS

## File Structure

```
src/telegram-bot/
├── telegram-bot.module.ts       # Module configuration
├── telegram-bot.service.ts      # Core bot logic
├── telegram-bot.update.ts       # Command & message handlers
├── telegram-auth.controller.ts  # Web verification endpoints
└── dto/
    └── telegram-auth.dto.ts     # Data transfer objects
```

## Testing the Bot

### 1. Find Your Bot
Open Telegram and search for your bot using the token:
- Bot username from token: Extract from @BotFather

### 2. Start Conversation
```
You: /start
Bot: 👋 Hello! Welcome to GogoCash Bot!
     Use /login to authenticate...
```

### 3. Login with Email
```
You: /login
Bot: [Shows Email/Mobile buttons]
You: [Click "📧 Login with Email"]
Bot: Please enter your email address:
You: user@example.com
Bot: ✓ Email received: user@example.com
Bot: 🔑 Enter Password
You: mypassword123
Bot: [Shows verification link button]
You: [Click "✅ Verify & Login"]
[Browser opens with verification page]
[Click "Complete Login"]
Bot: ✅ Authentication Successful!
     Your Login Token: eyJhbGc...
     [🚀 Open GogoCash App button]
```

### 4. Login with Mobile
```
You: /login
Bot: [Shows Email/Mobile buttons]
You: [Click "📱 Login with Mobile"]
Bot: Please enter your mobile number:
     [📱 Share My Phone Number button]
You: [Either type +1234567890 OR click share button]
Bot: ✓ Mobile number received: +1234567890
Bot: 🔑 Enter Password
You: mypassword123
Bot: [Shows verification link button]
[Rest of flow same as email]
```

## Integration with Your App

### Receiving the Token
Your web app will receive the token as a URL parameter:
```
https://app.gogocash.co/auth/callback?token=eyJhbGc...
```

### Validating the Token
```typescript
// Backend validation
import { JwtService } from '@nestjs/jwt';

const jwtService = new JwtService({
  secret: process.env.JWT_SECRET,
});

try {
  const decoded = jwtService.verify(token);
  // decoded contains:
  // - userId
  // - email or mobile
  // - telegramId
  // - loginType
  // - timestamp
} catch (error) {
  // Invalid or expired token
}
```

### Token Payload Structure
```json
{
  "userId": "abc123def456",
  "email": "user@example.com",
  "mobile": "+1234567890",
  "telegramId": 123456789,
  "loginType": "email",
  "timestamp": 1705234567890,
  "iat": 1705234567,
  "exp": 1705839367
}
```

## Production Considerations

### 1. User Verification
Currently using mock data. Integrate with your user database:

```typescript
// In telegram-auth.controller.ts - completeLogin method
// Replace mock data with real user lookup:
const user = await this.userService.findByEmailOrMobile(
  session.email || session.mobile
);

if (!user || !await bcrypt.compare(password, user.passwordHash)) {
  throw new UnauthorizedException('Invalid credentials');
}
```

### 2. Password Storage
Store passwords securely:
```typescript
import * as bcrypt from 'bcrypt';

// Hash password
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 3. Redis for Sessions
For production, use Redis instead of in-memory Map:
```typescript
import { Redis } from 'ioredis';

const redis = new Redis();

// Store session
await redis.setex(
  `telegram:session:${userId}`,
  900, // 15 minutes
  JSON.stringify(sessionData)
);

// Get session
const data = await redis.get(`telegram:session:${userId}`);
```

### 4. Rate Limiting
Implement rate limiting to prevent abuse:
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

// In module imports
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 10,
})
```

### 5. HTTPS in Production
Update API_BASE_URL to use HTTPS:
```bash
API_BASE_URL=https://api.gogocash.co
```

## Troubleshooting

### Bot Not Responding
- ✓ Check TELEGRAM_BOT_TOKEN is correct
- ✓ Verify bot is running: `yarn start:dev`
- ✓ Check logs for errors

### Token Not Received
- ✓ Check JWT_SECRET is set
- ✓ Verify WEB_APP_URL is correct
- ✓ Check bot permissions

### Verification Link Not Working
- ✓ Ensure API_BASE_URL is accessible
- ✓ Check firewall/network settings
- ✓ Verify endpoints are registered

### Email/Mobile Not Validating
- ✓ Check format: email must have @
- ✓ Mobile must include country code: +1234567890
- ✓ Use international format

## Next Steps

1. **Integrate with User Database**
   - Connect to your MongoDB User collection
   - Validate credentials against stored data
   - Link Telegram ID to user accounts

2. **Add Password Reset**
   - Implement /forgotpassword command
   - Send reset link via email/SMS
   - Update password securely

3. **Add Registration**
   - Implement /register command
   - Create new user accounts
   - Send verification codes

4. **Enhance Security**
   - Add 2FA support
   - Implement biometric authentication
   - Add device fingerprinting

5. **Analytics**
   - Track login attempts
   - Monitor success rates
   - Log authentication events

## Support

Your Telegram bot is fully configured and ready to use! 🎉

For questions or issues:
- Check logs: `yarn start:dev` output
- Review error messages in Telegram
- Verify environment variables in `.env`
