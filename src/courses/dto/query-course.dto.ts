import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryCourseDto {
  @ApiPropertyOptional({ example: 'IELTS', description: 'IELTS | TOEFL | General' })
  @IsOptional()
  @IsString()
  exam?: string;

  @ApiPropertyOptional({ example: 'basic', description: 'basic | ielts | toefl' })
  @IsOptional()
  @IsString()
  level?: string;
}
