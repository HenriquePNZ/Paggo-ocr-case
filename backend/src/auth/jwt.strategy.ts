import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';  
import { PassportStrategy } from '@nestjs/passport';  
import { ConfigService } from '@nestjs/config';  
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
      secretOrKey: configService.get<string>('JWT_SECRET', 'default_secret_key'), 
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };  // Retorna o payload do JWT (usuário autenticado)
  }
}
