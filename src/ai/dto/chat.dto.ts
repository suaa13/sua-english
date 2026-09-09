import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const CHAT_ROLES = ['system', 'user', 'assistant'] as const;
export const CHAT_SCENES = ['casual', 'ielts', 'toefl', 'coach'] as const;

export type ChatRole = (typeof CHAT_ROLES)[number];
export type ChatScene = (typeof CHAT_SCENES)[number];

export class ChatMessageDto {
  @IsIn(CHAT_ROLES)
  role: ChatRole;

  @IsString()
  content: string;
}

export class ChatDto {
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  // 场景决定系统提示（考官 / 教练 / 闲聊），缺省按闲聊处理
  @IsOptional()
  @IsIn(CHAT_SCENES)
  scene?: ChatScene;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;
}
