import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Public, Session } from '../auth/decorators';
import { UserId } from '../auth/user-id.decorator';
import { AuthGuard } from '../auth/auth-guard';
import type { UserSession } from '../auth/auth-types';

@Controller()
@UseGuards(AuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* 
    Protected route that requires authentication
    The session and userId are automatically injected by the AuthGuard
  */
  @Get('/cats')
  getCats(
    @Session() session: UserSession,
    @UserId() userId: string,
    @Body() body: any,
  ): { message: string } {
    console.log({
      session,
      userId,
      body,
    });

    return { message: this.appService.getCat() };
  }

  /* 
   Public route that does not require authentication
  */
  @Post('/cats')
  @Public()
  sayHello(
    @Session() session: UserSession | undefined,
    @UserId() userId: string | undefined,
    @Body() body: any,
  ): { message: string } {
    console.log({
      session,
      userId,
      body,
    });

    return { message: this.appService.getCat() };
  }
}
