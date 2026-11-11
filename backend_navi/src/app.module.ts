import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { KpisModule } from './modules/kpis/kpis.module';
import { FleetModule } from './modules/fleet/fleet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGO_URI',
          'mongodb://admin:naviport_secret_password@localhost:27017/naviport?authSource=admin',
        ),
        serverSelectionTimeoutMS: 3000,
      }),
    }),
    RedisModule,
    DatabaseModule,
    AuthModule,
    TrackingModule,
    ScannerModule,
    IncidentsModule,
    KpisModule,
    FleetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
