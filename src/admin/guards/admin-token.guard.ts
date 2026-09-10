import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * 管理后台守卫：用静态令牌而不是用户账号体系。
 *
 * 管理员不需要是一个普通用户（也不该有学习数据），所以走独立通道：
 * 请求头 `x-admin-token` 必须等于环境变量 `ADMIN_TOKEN`。
 * 未配置 ADMIN_TOKEN 时一律拒绝（503），避免"没设密码等于敞开"。
 */
export const ADMIN_TOKEN_HEADER = 'x-admin-token';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const expected = (process.env.ADMIN_TOKEN || '').trim();
    if (!expected) {
      throw new ServiceUnavailableException({
        code: 'ADMIN_NOT_CONFIGURED',
        message: '服务端未配置 ADMIN_TOKEN，管理后台已停用',
      });
    }
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const provided = String(req.headers?.[ADMIN_TOKEN_HEADER] || '').trim();
    if (!provided || provided !== expected) {
      throw new UnauthorizedException({ code: 'ADMIN_UNAUTHORIZED', message: '管理令牌无效' });
    }
    return true;
  }
}
