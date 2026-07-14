import {
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';

import { AuthService } from './auth.service';
import { LoginInput, RegisterInput, loginSchema, registerSchema } from './auth.schemas';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) input: LoginInput) {
    return this.authService.login(input);
  }

  @Post('register')
  @HttpCode(201)
  register(@Body(new ZodValidationPipe(registerSchema)) input: RegisterInput) {
    return this.authService.register(input);
  }
}