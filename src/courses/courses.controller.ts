import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { CoursesService } from './courses.service';
import { QueryCourseDto } from './dto/query-course.dto';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @ApiOperation({ summary: '获取课程目录（可按 exam / level 筛选）' })
  list(@Query() query: QueryCourseDto) {
    return this.courses.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取课程详情（含课时列表，支持 id 或 slug）' })
  detail(@Param('id') id: string) {
    return this.courses.detail(id);
  }
}
