import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Public route that still wants req.user populated when a valid token happens to be
// present (e.g. a booking made by either a guest or a logged-in passenger). Plain
// @Public() routes skip JWT validation entirely — this one deliberately still pays
// for it, so reserve it for handlers that actually read @CurrentUser().
export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
