import { Module } from '@nestjs/common';
import { DashboardAnalyticsController, DashboardAnalyticsService } from './dashboard';
import { HealthController, HealthService } from './health';
import { HevyClient, HevyController, HevySyncService } from './hevy';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [HealthController, HevyController, DashboardAnalyticsController],
  providers: [PrismaService, HealthService, HevyClient, HevySyncService, DashboardAnalyticsService],
})
export class AppModule {}
