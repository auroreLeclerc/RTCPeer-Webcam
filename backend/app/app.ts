import { Module } from "@nestjs/common";
import { ChannelsController } from "./controller/channels.js";
import { WebSocketProvider } from "./controller/websocket.provider.js";
import { SocketsInjection } from "./provider/Sockets.js";

@Module({
	imports: [],
	controllers: [ChannelsController],
	providers: [WebSocketProvider, SocketsInjection],
})
export class AppModule {}
