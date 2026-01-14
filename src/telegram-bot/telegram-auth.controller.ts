import {
  Controller,
  Get,
  Query,
  Res,
  HttpStatus,
  Logger,
  Post,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import { LoginType, TelegramBotService } from './telegram-bot.service';

@Controller('telegram-auth')
export class TelegramAuthController {
  private readonly logger = new Logger(TelegramAuthController.name);
  // Store temporary verification data (in production, use Redis or database)
  //   private verificationData: Map<
  //     string,
  //     { telegramUserId: number; identifier: string; type: string }
  //   > = new Map();

  constructor(private readonly telegramBotService: TelegramBotService) {}

  /**
   * Verification page endpoint
   */
  @Get('verify')
  async verifyPage(
    @Query('sessionId') sessionId: string,
    @Query('type') type: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      if (!sessionId || !type) {
        return res.status(HttpStatus.BAD_REQUEST).send(`
<!DOCTYPE html>
<html>
<head>
  <title>Error</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; text-align: center; padding: 2rem; background: #f5f5f5; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1 class="error">❌ Error</h1>
  <p>Missing required parameters</p>
</body>
</html>`);
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>GogoCash Login Verification</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 450px;
      width: 100%;
    }
    .logo { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #333; margin-bottom: 0.5rem; font-size: 1.8rem; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .status {
      padding: 1rem;
      border-radius: 10px;
      margin: 1.5rem 0;
      font-size: 1.1rem;
    }
    .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .processing { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .info-box {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      text-align: left;
    }
    .info-box strong { color: #495057; }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 30px;
      font-size: 16px;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 1rem;
      width: 100%;
      font-weight: 600;
      transition: background 0.3s;
    }
    .btn:hover { background: #5568d3; }
    .btn:disabled { background: #ccc; cursor: not-allowed; }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .note {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #e7f3ff;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #004085;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔐</div>
    <h1>GogoCash Login</h1>
    <p class="subtitle">Complete your authentication</p>
    
    <div id="status" class="status processing">
      <div class="loading"></div>
      <p>Verifying your session...</p>
    </div>

    <div id="content"></div>

    <div class="note">
      🔒 Your information is secure and encrypted
    </div>
  </div>

  <script>
    const sessionId = '${sessionId}';
    const loginType = '${type}';
    const apiUrl = '${process.env.API_BASE_URL || 'http://localhost:8080'}';

    // Simulate verification (in production, verify with backend)
    setTimeout(() => {
      const statusEl = document.getElementById('status');
      const contentEl = document.getElementById('content');
      
      statusEl.className = 'status success';
      statusEl.innerHTML = '<p>✅ Verification Successful!</p>';
      
      contentEl.innerHTML = \`
        <div class="info-box">
          <p><strong>Session ID:</strong> \${sessionId.substring(0, 20)}...</p>
          <p><strong>Login Type:</strong> \${loginType === 'email' ? '📧 Email' : '📱 Mobile'}</p>
        </div>
        <button id="completeBtn" class="btn" onclick="completeLogin()">
          Complete Login
        </button>
      \`;
    }, 1500);

    async function completeLogin() {
      const btn = document.getElementById('completeBtn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading"></div> Processing...';

      try {
        const response = await fetch(\`\${apiUrl}/telegram-auth/complete\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            type: loginType
          })
        });

        if (response.ok) {
          window.location.href = \`\${apiUrl}/telegram-auth/success?sessionId=\${sessionId}\`;
        } else {
          throw new Error('Authentication failed');
        }
      } catch (error) {
        const statusEl = document.getElementById('status');
        statusEl.className = 'status error';
        statusEl.innerHTML = '<p>❌ Authentication failed. Please try again in Telegram.</p>';
        btn.disabled = false;
        btn.innerHTML = 'Retry';
      }
    }
  </script>
</body>
</html>`;

      res.status(HttpStatus.OK).send(html);
    } catch (error) {
      this.logger.error('Error in verification page:', error);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Internal server error');
    }
  }

  /**
   * Complete login endpoint
   */
  @Post('complete')
  async completeLogin(
    @Body() body: { sessionId: string; type: LoginType },
    @Res() res: Response,
  ): Promise<any> {
    try {
      const { sessionId, type } = body;

      // In production, verify the session and generate real JWT token
      // For now, we'll generate a token with mock data
      const mockUserData = {
        userId: sessionId.substring(0, 10),
        email: type === 'email' ? 'user@example.com' : undefined,
        mobile: type === 'mobile' ? '+1234567890' : undefined,
        telegramId: 12345,
      };

      const token = this.telegramBotService.generateJwtToken(
        mockUserData,
        type,
      );

      // Store for success page
      //   this.verificationData.set(sessionId, {
      //     telegramUserId: 12345,
      //     identifier: mockUserData.email || mockUserData.mobile || '',
      //     type: type,
      //   });

      this.telegramBotService.storeLoginSession(12345, {
        telegramUserId: 12345,
        email: mockUserData.email,
        mobile: mockUserData.mobile,
        awaitingInput: type,
        timestamp: Date.now(),
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        token,
      });
    } catch (error) {
      this.logger.error('Error completing login:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Authentication failed',
      });
    }
  }

  /**
   * Success page
   */
  @Get('success')
  async successPage(
    @Query('sessionId') sessionId: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      console.log('sessionId', sessionId);
      //   const data = this.verificationData.get(sessionId);
      const data = this.telegramBotService.getLoginSession(12345);
      if (!data) {
        return res.status(HttpStatus.NOT_FOUND).send('Session not found');
      }

      // Generate token
      const mockUserData = {
        userId: sessionId.substring(0, 10),
        email: data.awaitingInput === 'email' ? data : undefined,
        mobile: data.awaitingInput === 'mobile' ? data : undefined,
        telegramId: data.telegramUserId,
      };

      const token = this.telegramBotService.generateJwtToken(
        mockUserData,
        data.awaitingInput || 'password',
      );

      // Send token to Telegram (mock telegram user ID for now)
      // In production, retrieve real telegram ID from session
      await this.telegramBotService.sendLoginToken(
        data.telegramUserId,
        token,
        data.awaitingInput || 'password',
        data.email || data.mobile || '',
      );

      // Clean up
      this.telegramBotService.deleteLoginSession(data.telegramUserId);

      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Success</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 450px;
      animation: slideIn 0.5s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .success-icon { font-size: 5rem; margin-bottom: 1rem; animation: bounce 1s; }
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-20px); }
      60% { transform: translateY(-10px); }
    }
    h1 { color: #4CAF50; margin-bottom: 1rem; }
    p { color: #666; line-height: 1.8; margin: 1rem 0; }
    .highlight {
      background: #f0f0f0;
      padding: 1.5rem;
      border-radius: 10px;
      margin: 1.5rem 0;
    }
    .highlight strong { color: #667eea; font-size: 1.1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <h1>Authentication Successful!</h1>
    <p>Your login has been completed successfully.</p>
    <div class="highlight">
      <p>📱 <strong>Please return to Telegram</strong></p>
      <p>Your login token has been sent to you!</p>
    </div>
    <p style="color: #999; font-size: 0.9rem;">You can close this window now.</p>
  </div>
</body>
</html>`;

      res.status(HttpStatus.OK).send(html);
    } catch (error) {
      this.logger.error('Error in success page:', error);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Internal server error');
    }
  }
}
