import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import { InterviewsService } from './interviews.service'
import { CreateInterviewDto } from './dto/create-interview.dto'
import { UpdateInterviewDto } from './dto/update-interview.dto'

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  async create(@Body() createInterviewDto: CreateInterviewDto) {
    return await this.interviewsService.create(createInterviewDto)
  }

  @Get()
  async findAll(
    @Query('jobId') jobId?: string,
    @Query('applicationId') applicationId?: string,
    @Query('date') date?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.interviewsService.findAll({
      jobId: jobId ? parseInt(jobId, 10) : undefined,
      applicationId,
      date,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return await this.interviewsService.findOne(id)
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateInterviewDto: UpdateInterviewDto,
  ) {
    return await this.interviewsService.update(id, updateInterviewDto)
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return await this.interviewsService.remove(id)
  }
}
