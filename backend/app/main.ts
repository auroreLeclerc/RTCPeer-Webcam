import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { WsAdapter } from "@nestjs/platform-ws";
import { AppModule } from "./app.js";
import { Logger } from "@nestjs/common";
import config from "./fullstack/config.json" assert { type: "json" };

NestFactory.create<NestExpressApplication>(AppModule).then((app) => {
	const logger = new Logger(AppModule.name);
	if (!config.frontend.startNextAsFront) app.useStaticAssets("../out/");
	else app.enableCors();
	app.useWebSocketAdapter(new WsAdapter(app));
	app.listen(config.backend.http.port).then(() => {
		app.getUrl().then((url) => logger.log(`Application is running on: ${url}`));
	});
});
