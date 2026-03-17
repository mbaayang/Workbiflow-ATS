import { PartialType } from '@nestjs/swagger'
import { CreateApplicationDto } from './create-application.dto'
import { IsOptional, IsEnum } from 'class-validator'

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {
	@IsOptional()
	@IsEnum(['pending', 'reviewing', 'accepted', 'rejected'])
	status?: 'pending' | 'reviewing' | 'accepted' | 'rejected'
}
