import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CaliobaseJwtPayload } from './jwt-payload';

@Injectable()
export class JwtSignerService {
  constructor(private jwtService: JwtService) {}

  async sign(payload: CaliobaseJwtPayload) {
    return await this.jwtService.signAsync(payload);
  }
}
