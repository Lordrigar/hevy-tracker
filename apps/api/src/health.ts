import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Injectable,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PrismaService } from './prisma.service';

export class HealthEntryDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200000)
  steps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20000)
  calories?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20000)
  calorieTarget?: number;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.healthEntry.findMany({ orderBy: { date: 'desc' } });
  }

  async upsert(dto: HealthEntryDto) {
    const date = this.toDate(dto.date);
    const data = this.dataFrom(dto);
    return this.prisma.healthEntry.upsert({
      where: { date },
      create: { date, ...data },
      update: data,
    });
  }

  async update(id: string, dto: HealthEntryDto) {
    try {
      return await this.prisma.healthEntry.update({
        where: { id },
        data: { date: this.toDate(dto.date), ...this.dataFrom(dto) },
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.healthEntry.delete({ where: { id } });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  private toDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private dataFrom(dto: HealthEntryDto) {
    return {
      steps: dto.steps,
      calories: dto.calories,
      calorieTarget: dto.calorieTarget,
    };
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException('Health entry not found');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A health entry already exists for this date');
    }
    throw error;
  }
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthService: HealthService,
  ) {}

  @Get('status')
  async status() {
    return { status: 'ok', service: 'hevy-tracker-api', database: await this.prisma.healthCheck() };
  }

  @Get()
  list() {
    return this.healthService.list();
  }

  @Post()
  create(@Body() dto: HealthEntryDto) {
    return this.healthService.upsert(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: HealthEntryDto) {
    return this.healthService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.healthService.remove(id);
    return { success: true };
  }
}
