import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { ProtectedController } from './protected/protected.controller';
import { DocumentsController } from './document.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    PrismaModule, 
    ConfigModule.forRoot(), //Carrega as variaveis do .env
    JwtModule.registerAsync({
      imports: [ConfigModule], 
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), 
        signOptions: { expiresIn: '1h' }, 
      }),
      inject: [ConfigService], 
    }),
  ],
  providers: [AuthService, JwtStrategy, DocumentsService], 
  controllers: [AuthController, ProtectedController, DocumentsController], 
})
export class AuthModule {}
