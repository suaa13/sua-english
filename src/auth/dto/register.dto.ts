import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsIn,
  IsNumber,
  IsInt,
  IsISO8601,
} from 'class-validator';

export const TARGET_EXAMS = ['IELTS', 'TOEFL', 'BOTH'] as const;
export const LEVELS = ['beginner', 'elementary', 'intermediate', 'upper', 'advanced'] as const;

export class RegisterDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'alice', description: '3-30 chars, letters/numbers/underscore' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ example: 'Password123', description: 'Min 8 chars, at least one letter and one number' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: '密码至少 8 位，且包含字母和数字' })
  password: string;

  @ApiPropertyOptional({ enum: TARGET_EXAMS })
  @IsOptional()
  @IsIn([...TARGET_EXAMS])
  targetExam?: string;

  @ApiPropertyOptional({ example: 6.5 })
  @IsOptional()
  @IsNumber()
  targetScore?: number;

  @ApiPropertyOptional({ enum: LEVELS })
  @IsOptional()
  @IsIn([...LEVELS])
  currentLevel?: string;

  @ApiPropertyOptional({ example: '2026-12-01', description: 'ISO date' })
  @IsOptional()
  @IsISO8601()
  examDate?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @IsNumber()
  dailyStudyMinutes?: number;
}
