import { Module } from '@nestjs/common';
import { HealthController, HealthService } from './health';
import { PrismaService } from './prisma.service';

@Module({ controllers: [HealthController], providers: [PrismaService, HealthService] })
export class AppModule {}
