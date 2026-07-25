import { Module } from "@nestjs/common";
import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    return { status: "ok", service: "hevy-tracker-api", database: await this.prisma.healthCheck() };
  }
}

@Module({ controllers: [HealthController], providers: [PrismaService] })
export class AppModule {}
