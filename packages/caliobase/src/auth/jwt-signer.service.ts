import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { CaliobaseJwtPayload } from './jwt-payload';

@Injectable()
export class JwtSignerService {
  constructor(private jwtService: JwtService) {}

  async sign(payload: CaliobaseJwtPayload, options?: JwtSignOptions) {
    return await this.jwtService.signAsync(payload, options);
  }
}
