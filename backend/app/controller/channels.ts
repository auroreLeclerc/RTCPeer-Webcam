import { Controller, Get, Query, ValidationPipe } from "@nestjs/common";
import { SocketsInjection } from "../provider/Sockets.js";

@Controller("API")
export class ChannelsController {
	constructor(private sockets: SocketsInjection) {}

	@Get("channels")
	channels() {
		return this.sockets.getChannels();
	}

	@Get("users")
	users(
		@Query("channel", new ValidationPipe({ expectedType: String }))
		channel: string
	) {
		return this.sockets.getUsers(channel);
	}
}
