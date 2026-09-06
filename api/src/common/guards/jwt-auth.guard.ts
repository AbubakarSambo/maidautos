import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, IS_OPTIONAL_AUTH_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  private isOptionalAuth(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const optionalAuth = this.isOptionalAuth(context);

    if (!this.isPublic(context) && !optionalAuth) {
      return super.canActivate(context) as Promise<boolean>;
    }

    if (!optionalAuth) {
      // Plain @Public(): nobody reads req.user here, so skip JWT validation
      // entirely instead of paying for a DB round-trip on every request.
      return true;
    }

    // Optional auth: still decode a token if one is present, so req.user is
    // populated for a logged-in caller, but never require or reject on one.
    try {
      await super.canActivate(context);
    } catch {
      // no-op — auth is optional on this route
    }
    return true;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (this.isPublic(context) || this.isOptionalAuth(context)) return user || null;
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
