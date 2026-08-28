import { Controller, Post, Get, Patch, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto } from './dto';
import { Public, CurrentUser } from '../../common';
import { GoogleProfile } from './strategies/google.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('resend-verification')
  resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  @ApiBearerAuth()
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @ApiBearerAuth()
  @Patch('me')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  // Kicks off the redirect to Google's consent screen — passport's google strategy
  // handles the actual redirect, this handler body never runs.
  @Public()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  googleAuth() {}

  // Google redirects back here after consent. On success we mint our own JWT and hand
  // it to the frontend via a query param on a full-page redirect (this is a browser
  // navigation, not an XHR call, so the token can't just be returned as JSON).
  @Public()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleAuthCallback(@Req() req: { user: GoogleProfile }, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('resend.frontendUrl');
    try {
      const { accessToken } = await this.authService.loginWithGoogle(req.user);
      res.redirect(`${frontendUrl}/auth/google/callback?token=${accessToken}`);
    } catch {
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }
}
