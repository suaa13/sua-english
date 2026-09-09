import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  targetExam?: string;
}

// Usage: `@User() user: AuthUser` inside a request handled by JwtAccessGuard.
export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
