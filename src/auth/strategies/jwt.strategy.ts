import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('jwt.accessSecret');
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return { sub: user.id, email: user.email, role: user.role };
  }
}
