import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, StrategyOptions, Profile, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      // Falls back to placeholder values so the app still boots when Google OAuth
      // hasn't been configured yet — hitting /auth/google will just fail at Google's
      // side (invalid_client) rather than crashing the server on startup.
      clientID: configService.get<string>('google.clientID') || 'not-configured',
      clientSecret: configService.get<string>('google.clientSecret') || 'not-configured',
      callbackURL: configService.get<string>('google.callbackURL'),
      scope: ['email', 'profile'],
    } as StrategyOptions);
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Google account has no email'), undefined);

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      firstName: profile.name?.givenName || profile.displayName || 'Google',
      lastName: profile.name?.familyName || 'User',
    };
    done(null, googleProfile);
  }
}
