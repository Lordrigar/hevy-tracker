import { Module } from '@nestjs/common';
import { DashboardAnalyticsController, DashboardAnalyticsService } from './dashboard';
import { HealthController, HealthService } from './health';
import { HevyClient, HevyController, HevySyncService } from './hevy';
import { PrismaService } from './prisma.service';
import { RoutineService, RoutinesController, RoutineSyncController } from './routines';

@Module({
  controllers: [
    HealthController,
    HevyController,
    DashboardAnalyticsController,
    RoutineSyncController,
    RoutinesController,
  ],
  providers: [
    PrismaService,
    HealthService,
    HevyClient,
    HevySyncService,
    DashboardAnalyticsService,
    RoutineService,
  ],
})
export class AppModule {}
