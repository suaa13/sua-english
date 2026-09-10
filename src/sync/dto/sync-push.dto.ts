import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * 线格式（wire format）刻意与前端 localStorage 里的形状保持完全一致：
 * 时间戳一律是毫秒数字、错题的主键字段就叫 `id`（= QuestionBank.id）。
 * 由服务端负责映射到 Prisma 的 DateTime / questionId，客户端同步层因此
 * 不需要做任何字段改名，少一层出错的机会。
 */
export class SyncWrongQuestionDto {
  @ApiProperty({ example: 'ckxyz...', description: '题库题目 id' })
  @IsString()
  @MaxLength(64)
  id: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) exam?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8000) prompt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8000) referenceAnswer?: string;

  @ApiPropertyOptional({ description: '加入错题本时间（ms）' })
  @IsOptional() @IsInt() @Min(0) wrongAt?: number;

  @ApiPropertyOptional({ description: '下次复习时间（ms）' })
  @IsOptional() @IsInt() @Min(0) dueAt?: number;

  @ApiPropertyOptional({ description: 'SM-2 间隔（天）' })
  @IsOptional() @IsInt() @Min(0) @Max(36500) interval?: number;

  @ApiPropertyOptional({ description: 'SM-2 难度因子 1.3–3.0' })
  @IsOptional() @IsNumber() @Min(1.3) @Max(3) ease?: number;

  @ApiPropertyOptional({ description: '连续答对次数' })
  @IsOptional() @IsInt() @Min(0) reps?: number;

  @ApiPropertyOptional({ description: '最后复习时间（ms）' })
  @IsOptional() @IsInt() @Min(0) lastReview?: number;

  @ApiPropertyOptional({ description: '客户端最后修改时间（ms），合并用' })
  @IsOptional() @IsInt() @Min(0) updatedAt?: number;
}

export class SyncTombstoneDto {
  @ApiProperty({ description: '被删除的题目 id' })
  @IsString()
  @MaxLength(64)
  id: string;

  @ApiProperty({ description: '删除发生时间（ms）' })
  @IsInt()
  @Min(0)
  ts: number;
}

/**
 * 应用主状态快照：词汇练习记录 / 错题 / 每日活动 / 模考 / 学习计划 / 连续天数。
 * 整体作为一个 JSON 文档做 last-write-wins —— 主状态本来就是"最后一次操作后的
 * 全量"，不需要逐条合并；粗粒度反而不会丢字段。
 */
export class SyncAppStateDto {
  @ApiPropertyOptional({ description: '前端主状态文档（JSON 对象）' })
  @IsOptional()
  @IsObject()
  doc?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '首次写入时间（ms）' })
  @IsOptional() @IsInt() @Min(0) createdAt?: number;

  @ApiPropertyOptional({ description: '客户端最后修改时间（ms），合并用' })
  @IsOptional() @IsInt() @Min(0) updatedAt?: number;
}

export class SyncPlanDto {
  @ApiPropertyOptional({ example: 'IELTS' })
  @IsOptional() @IsString() @MaxLength(32) goal?: string;

  @ApiPropertyOptional({ description: '每日题量' })
  @IsOptional() @IsInt() @Min(1) @Max(500) daily?: number;

  @ApiPropertyOptional({ description: '周期天数' })
  @IsOptional() @IsInt() @Min(1) @Max(365) days?: number;

  @ApiPropertyOptional({ description: '科目权重 { Vocabulary: 40, ... }' })
  @IsOptional() @IsObject() weights?: Record<string, number>;

  @ApiPropertyOptional({ description: '日程 [{ date, tasks: [{ subject, count }] }]' })
  @IsOptional() @IsArray() @ArrayMaxSize(400) schedule?: any[];

  @ApiPropertyOptional({ description: '每日完成量 { "2026-08-30": 12 }' })
  @IsOptional() @IsObject() progress?: Record<string, number>;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) streak?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) createdAt?: number;

  @ApiPropertyOptional({ description: '客户端最后修改时间（ms），合并用' })
  @IsOptional() @IsInt() @Min(0) updatedAt?: number;
}

export class SyncCefrDto {
  @ApiPropertyOptional({ description: '综合 CEFR 等级', example: 'B1' })
  @IsOptional() @IsString() @MaxLength(4) overall?: string;

  @ApiPropertyOptional({ description: '分项等级 { listening, speaking, reading, writing } 各 A1-C2' })
  @IsOptional() @IsObject() skills?: Record<string, string>;

  @ApiPropertyOptional({ description: '诊断样本 + 0-2 自评 + 日期' })
  @IsOptional() @IsObject() diagnostic?: any;

  @ApiPropertyOptional({ description: '12 周真实任务目标 { scene, task, qualityBar, evidence, due }' })
  @IsOptional() @IsObject() goal12w?: any;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) createdAt?: number;

  @ApiPropertyOptional({ description: '客户端最后修改时间（ms），合并用' })
  @IsOptional() @IsInt() @Min(0) updatedAt?: number;
}

export class SyncLearningStateDto {
  @ApiPropertyOptional({ description: '元学习档案：目标/基线/已完成/错误/方法/假设/下一步' })
  @IsOptional()
  @IsObject()
  doc?: any;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) createdAt?: number;

  @ApiPropertyOptional({ description: '客户端最后修改时间（ms），合并用' })
  @IsOptional()
  @IsInt()
  @Min(0)
  updatedAt?: number;
}

export class SyncWeeklyReviewDto {
  @ApiProperty({ example: '2026-W35', description: 'ISO 周起始标识' })
  @IsString()
  @MaxLength(16)
  weekStart: string;

  @ApiPropertyOptional({ description: '证据 / 四项检查 / 错误模式 / 精力 / 下周一件事' })
  @IsOptional()
  @IsObject()
  doc?: any;

  @ApiPropertyOptional({ description: '墓碑：true 表示该周复盘已被删除' })
  @IsOptional()
  @IsBoolean()
  deleted?: boolean;

  @ApiPropertyOptional({ description: '客户端最后修改时间（ms），合并用' })
  @IsOptional()
  @IsInt()
  @Min(0)
  updatedAt?: number;
}

export class SyncWeeklyReviewTombstoneDto {
  @ApiProperty({ example: '2026-W35' })
  @IsString()
  @MaxLength(16)
  weekStart: string;

  @ApiProperty({ description: '删除发生时间（ms）' })
  @IsInt()
  @Min(0)
  ts: number;
}

export class SyncPushDto {
  @ApiPropertyOptional({ type: SyncPlanDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncPlanDto)
  plan?: SyncPlanDto;

  @ApiPropertyOptional({ type: SyncPlanDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncCefrDto)
  cefr?: SyncCefrDto;

  @ApiPropertyOptional({ description: '本地计划被清除的时间（ms）。用于把"重新规划"传播到其他设备' })
  @IsOptional() @IsInt() @Min(0) planRemovedAt?: number;

  @ApiPropertyOptional({ type: [SyncWrongQuestionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => SyncWrongQuestionDto)
  wrongQuestions?: SyncWrongQuestionDto[];

  @ApiPropertyOptional({ type: [SyncTombstoneDto], description: '删除墓碑' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => SyncTombstoneDto)
  tombstones?: SyncTombstoneDto[];

  @ApiPropertyOptional({ type: SyncLearningStateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncLearningStateDto)
  state?: SyncLearningStateDto;

  @ApiPropertyOptional({ type: SyncAppStateDto, description: '应用主状态快照（学习进度主数据）' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncAppStateDto)
  appState?: SyncAppStateDto;

  @ApiPropertyOptional({ type: [SyncWeeklyReviewDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(104)
  @ValidateNested({ each: true })
  @Type(() => SyncWeeklyReviewDto)
  weeklyReviews?: SyncWeeklyReviewDto[];

  @ApiPropertyOptional({ type: [SyncWeeklyReviewTombstoneDto], description: '每周复盘删除墓碑' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(104)
  @ValidateNested({ each: true })
  @Type(() => SyncWeeklyReviewTombstoneDto)
  weeklyReviewTombstones?: SyncWeeklyReviewTombstoneDto[];
}
