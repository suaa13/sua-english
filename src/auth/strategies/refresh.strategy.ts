import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface RefreshPayload {
  id: string;
  jti: string;
}

// Refresh tokens are validated by signature here; the service layer additionally
// verifies the jti exists in DB, is not revoked, and is not expired.
@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') || 'dev-refresh-secret',
    });
  }

  async validate(payload: any): Promise<RefreshPayload> {
    if (!payload?.sub || !payload?.jti) throw new UnauthorizedException('Invalid refresh token');
    return { id: payload.sub, jti: payload.jti };
  }
}
