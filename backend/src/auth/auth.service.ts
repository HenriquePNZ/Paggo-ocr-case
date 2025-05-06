import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; //Para criptografar senhas
import { PrismaService } from 'src/prisma/prisma.service'; //Para ter acesso ao banco de dados

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ){}

    async register(email: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await this.prisma.user.create({
            data: {
                email, 
                password: hashedPassword,
            },
        });
        return user;
    }

    async login(email: string, password: string) {
        const user = await this. prisma.user.findUnique({
            where: {email},
        });

        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado.');
          }
      
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            throw new UnauthorizedException('Senha incorreta');
          }
      
          const payload = { email: user.email, sub: user.id };
          return {
            access_token: this.jwtService.sign(payload),
          };
    }
}
