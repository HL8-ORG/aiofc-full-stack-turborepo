import { AuthModule } from "@kylegillen/nestjs-fastify-better-auth";
import { Module } from "@nestjs/common";
import { AppController } from "./app/app.controller";
import { AppService } from "./app/app.service";
import { auth } from "./auth";

@Module({
	imports: [
		AuthModule.forRoot({
			auth: auth,
		}),
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
