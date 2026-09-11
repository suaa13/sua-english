import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { AdminAuthService } from '../admin-auth.service';

/**
 * 管理后台守卫：校验 `Authorization: Bearer <管理员会话令牌>`。
 *
 * 令牌由 `POST /api/v1/admin/login` 用账号密码换取（见 AdminAuthService）。
 * 未配置账号密码时一律 503，避免"没设密码等于敞开"。
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (!this.auth.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'ADMIN_NOT_CONFIGURED',
        message: '服务端未配置管理员账号密码（ADMIN_USERNAME / ADMIN_PASSWORD），管理后台已停用',
      });
    }

    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      admin?: { name: string };
    }>();
    const match = /^Bearer\s+(.+)$/i.exec(String(req.headers?.authorization || '').trim());
    const identity = match ? this.auth.verify(match[1].trim()) : null;

    if (!identity) {
      throw new UnauthorizedException({
        code: 'ADMIN_UNAUTHORIZED',
        message: '登录已失效，请重新登录',
      });
    }

    req.admin = identity;
    return true;
  }
}
