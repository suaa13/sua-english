import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  // Accepts email OR username.
  @ApiProperty({ example: 'alice@example.com' })
  @IsString()
  @MinLength(1)
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(1)
  password: string;
}
