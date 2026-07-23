import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.isPublic(context)) {
      return super.canActivate(context) as Promise<boolean>;
    }

    // Public route: still decode a token if one is present, so req.user is
    // populated for a logged-in caller, but never require or reject on one.
    try {
      await super.canActivate(context);
    } catch {
      // no-op — auth is optional on public routes
    }
    return true;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (this.isPublic(context)) return user || null;
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
