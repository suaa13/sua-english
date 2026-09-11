import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'sua123', description: '管理员账号' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: 'sua2026!', description: '管理员密码' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
