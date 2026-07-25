import { Module } from "@nestjs/common";
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() { return { status: "ok", service: "hevy-tracker-api" }; }
}

@Module({ controllers: [HealthController] })
export class AppModule {}
