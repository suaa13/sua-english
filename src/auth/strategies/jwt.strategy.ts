import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'dev-access-secret',
    });
  }

  async validate(payload: any): Promise<AuthUser> {
    if (!payload?.sub) throw new UnauthorizedException('Invalid token');
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      targetExam: payload.targetExam,
    };
  }
}
