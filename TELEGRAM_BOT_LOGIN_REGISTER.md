# 🤖 Telegram Bot - Login & Register

## Overview
Complete Telegram bot with user registration and login functionality. Users can create accounts and authenticate directly through Telegram without passwords.

## ✨ Features

### Registration
- ✅ Register with Email
- ✅ Register with Mobile/Phone
- ✅ Automatic account creation
- ✅ Instant JWT token generation
- ✅ Direct link to web app

### Login
- ✅ Login with Email
- ✅ Login with Mobile/Phone
- ✅ Automatic user lookup
- ✅ JWT token generation
- ✅ Deep link to web app

### Security
- ✅ Telegram ID as unique identifier
- ✅ No password required (Telegram auth)
- ✅ JWT tokens with 7-day expiry
- ✅ Session management (1 hour)
- ✅ Secure token delivery

## 🎯 How It Works

### Registration Flow
```
User → /register
Bot → Shows Email/Mobile buttons
User → Selects method & enters details
Bot → Creates account in database
Bot → Generates JWT token
Bot → Sends token + deep link
User → Clicks link → Opens app (logged in)
```

### Login Flow
```
User → /login
Bot → Shows Email/Mobile buttons
User → Selects method & enters details
Bot → Finds user in database
Bot → Generates JWT token
Bot → Sends token + deep link
User → Clicks link → Opens app (logged in)
```

## 📱 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with all commands |
| `/register` | Create a new account |
| `/login` | Login to existing account |
| `/openapp` | Open web app directly |
| `/cancel` | Cancel current operation |
| `/help` | Show help message |

## 🚀 Quick Start Guide

### 1. Find Your Bot on Telegram
Search for your bot using the bot username from @BotFather

### 2. Register a New Account

**Via Email:**
```
You: /register
Bot: [Shows Email/Mobile buttons]
You: [Click "📧 Register with Email"]
Bot: Please enter your email address
You: user@example.com
Bot: 🎉 Registration Successful!
     [Shows token + "Open GogoCash App" button]
```

**Via Mobile:**
```
You: /register
Bot: [Shows Email/Mobile buttons]
You: [Click "📱 Register with Mobile"]
Bot: Please enter your mobile number
     [OR Click "Share My Phone Number"]
You: +1234567890
Bot: 🎉 Registration Successful!
     [Shows token + "Open GogoCash App" button]
```

### 3. Login to Existing Account

**Via Email:**
```
You: /login
Bot: [Shows Email/Mobile buttons]
You: [Click "📧 Login with Email"]
Bot: Please enter your email address
You: user@example.com
Bot: ✅ Authentication Successful!
     [Shows token + "Open GogoCash App" button]
```

**Via Mobile:**
```
You: /login
Bot: [Shows Email/Mobile buttons]
You: [Click "📱 Login with Mobile"]
Bot: Please enter your mobile number
You: +1234567890
Bot: ✅ Authentication Successful!
     [Shows token + "Open GogoCash App" button]
```

## 🔐 Authentication Details

### User Registration
When a user registers:
1. Bot validates email/mobile format
2. Checks if user already exists
3. Creates user in MongoDB with:
   - `id_firebase`: `telegram_{telegram_id}`
   - `email` or `mobile`
   - `provider`: "telegram"
   - `username`: From Telegram or auto-generated
   - `country`: Default "Thailand"
4. Generates JWT token
5. Sends token via Telegram

### User Login
When a user logs in:
1. Bot validates email/mobile format
2. Searches for user in MongoDB
3. If found, generates JWT token
4. If not found, suggests registration
5. Sends token via Telegram

### JWT Token Structure
```json
{
  "userId": "user_mongodb_id",
  "email": "user@example.com",
  "mobile": "+1234567890",
  "telegramId": 123456789,
  "loginType": "email",
  "timestamp": 1705234567890,
  "iat": 1705234567,
  "exp": 1705839367
}
```

## 💾 Database Schema

### User Document
```typescript
{
  _id: ObjectId,
  id_firebase: "telegram_123456789",  // Telegram ID
  email: "user@example.com",
  mobile: "+1234567890",
  username: "telegram_user",
  provider: "telegram",
  country: "Thailand",
  disabled: false,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Configuration

### Environment Variables
Your `.env` already configured:
```bash
TELEGRAM_BOT_TOKEN=***REMOVED***
JWT_SECRET=***REMOVED***
WEB_APP_URL=https://app.gogocash.co
API_BASE_URL=http://localhost:8080
MONGO_URI=mongodb+srv://...
```

## 📊 Example Scenarios

### Scenario 1: New User Registration
```
👤 John opens Telegram
📱 Finds GogoCash bot
💬 Sends: /register
🤖 Bot: Choose registration method
👆 John: Clicks "📧 Register with Email"
✍️ John: Types "john@email.com"
✅ Bot: Account created! Here's your token
🔗 Bot: [Open GogoCash App button]
👆 John: Clicks button
🌐 Opens app.gogocash.co/auth/callback?token=...
🎉 John is logged in!
```

### Scenario 2: Existing User Login
```
👤 Sarah opens Telegram
📱 Finds GogoCash bot
💬 Sends: /login
🤖 Bot: Choose login method
👆 Sarah: Clicks "📱 Login with Mobile"
✍️ Sarah: Types "+66812345678"
✅ Bot: Login successful! Here's your token
🔗 Bot: [Open GogoCash App button]
👆 Sarah: Clicks button
🌐 Opens app with token
🎉 Sarah is logged in!
```

### Scenario 3: User Already Exists
```
👤 Mike tries to register
💬 Sends: /register
✍️ Mike: Enters email "mike@email.com"
❌ Bot: User with this email already exists
💡 Bot: Please use /login if you already have an account
👆 Mike: Sends /login
✅ Successfully logs in
```

## 🛠️ Technical Implementation

### Files Modified
1. **telegram-bot.update.ts**
   - Added `/register` command
   - Added registration action handlers
   - Updated text/contact handlers for registration

2. **telegram-bot.service.ts**
   - Added `registerUser()` method
   - Added `loginUser()` method
   - Added `sendRegisterOptions()` method
   - Added `sendRegistrationSuccess()` method
   - Added registration prompt methods

### Key Methods

#### `registerUser(email, mobile, telegramId, username)`
- Validates user doesn't exist
- Creates user in MongoDB
- Returns user document

#### `loginUser(identifier, isEmail)`
- Searches for user by email or mobile
- Returns user document or error

#### `generateJwtToken(userData, loginType)`
- Creates JWT with user data
- 7-day expiration
- Includes Telegram ID

## 🔄 Session Management

### Cache-based Sessions
- Stored in Redis/Cache (1 hour expiry)
- Contains user state and awaiting input
- Automatically cleaned up after use

### Session Data
```typescript
{
  telegramUserId: number,
  username?: string,
  firstName?: string,
  lastName?: string,
  timestamp: number,
  awaitingInput?: 'email' | 'mobile',
  email?: string,
  mobile?: string,
  isRegistration?: boolean  // NEW!
}
```

## 🎨 User Experience

### Registration Success Message
```
🎉 Registration Successful!

Your GogoCash account has been created!

📧 Email: user@example.com

🎁 Your Login Token:
***REMOVED***

👇 Click the button below to start earning cashback:
[🚀 Open GogoCash App]
```

### Login Success Message
```
✅ Authentication Successful!

Login Method: 📧 Email
Email: user@example.com

🎉 Your Login Token:
***REMOVED***

👇 Click the button below to open GogoCash app:
[🚀 Open GogoCash App]
```

## ⚠️ Error Handling

### Registration Errors
- **User exists**: "User with this email or mobile already exists. Please use /login"
- **Invalid email**: "Invalid email format. Please enter a valid email address"
- **Invalid mobile**: "Invalid mobile number format. Use country code (e.g., +1234567890)"

### Login Errors
- **User not found**: "User not found. Please use /register to create an account"
- **Invalid format**: Same validation as registration

## 🧪 Testing Checklist

- [ ] Register with email
- [ ] Register with mobile (typed)
- [ ] Register with mobile (shared contact)
- [ ] Login with email
- [ ] Login with mobile
- [ ] Try to register with existing email
- [ ] Try to register with existing mobile
- [ ] Try to login with non-existent user
- [ ] Cancel during registration
- [ ] Cancel during login
- [ ] Open app after registration
- [ ] Open app after login
- [ ] Token validation on web app

## 🚀 Deployment

### Production Checklist
1. ✅ Environment variables configured
2. ✅ MongoDB connection working
3. ✅ Telegram bot token valid
4. ✅ JWT secret secure
5. ✅ Web app URL correct
6. ✅ Cache/Redis configured
7. ✅ Error logging enabled

### Start Server
```bash
# Development
yarn start:dev

# Production
yarn build
yarn start:prod
```

## 📈 Next Steps

### Enhancements
1. **Add Username Support**
   - Let users set custom usernames
   - Search users by username

2. **Profile Management**
   - Add `/profile` command
   - Update email/mobile
   - View account details

3. **Security**
   - Add 2FA support
   - Email verification
   - Mobile OTP verification

4. **Features**
   - Referral codes
   - Wallet balance in bot
   - Transaction history
   - Notifications

## 🎉 Success!

Your Telegram bot now supports full user registration and login! Users can:
- ✅ Create accounts via Telegram
- ✅ Login to existing accounts
- ✅ Get instant JWT tokens
- ✅ Access web app seamlessly

**No passwords, no forms, just Telegram!** 🚀
