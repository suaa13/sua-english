import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminController } from './admin.controller';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@Module({
  // 只用到 sign/verify，密钥在每次调用时显式传入（见 AdminAuthService.secret）。
  imports: [JwtModule.register({})],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService, AdminAuthGuard],
})
export class AdminModule {}
