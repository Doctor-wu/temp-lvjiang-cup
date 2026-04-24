import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { TeamsModule } from './modules/teams/teams.module';
import { MatchesModule } from './modules/matches/matches.module';
import { StreamsModule } from './modules/streams/streams.module';
import { StreamersModule } from './modules/streamers/streamers.module';
import { VideosModule } from './modules/videos/videos.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { MatchDataModule } from './modules/match-data/match-data.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import appConfig from './config/app.config';
import { getUploadBaseDir } from './common/utils/path.util';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      ignoreEnvFile: false,
    }),
    ServeStaticModule.forRoot({
      rootPath: getUploadBaseDir(),
      serveRoot: '/api/uploads',
    }),
    DatabaseModule,
    CacheModule,
    TeamsModule,
    MatchesModule,
    StreamsModule,
    StreamersModule,
    VideosModule,
    AuthModule,
    AdminModule,
    UploadModule,
    MatchDataModule,
    TrackingModule,
  ],
})
export class AppModule {}
