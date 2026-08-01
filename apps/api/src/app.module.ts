import { Module } from '@nestjs/common';
import { HealthController, HealthService } from './health';
import { HevyClient, HevyController, HevySyncService } from './hevy';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [HealthController, HevyController],
  providers: [PrismaService, HealthService, HevyClient, HevySyncService],
})
export class AppModule {}
