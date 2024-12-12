import { Logger, ValidationPipe } from "@nestjs/common";
import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import { SocketsInjection } from "../provider/Sockets.js";
import { WebSocket } from "ws";
import {
	MessageInterface,
	EventList,
	AnswerInterface,
} from "../fullstack/SubscribeMessageType.js";
import config from "../fullstack/config.json" assert { type: "json" };

@WebSocketGateway(config.backend.ws.port)
export class WebSocketProvider {
	@WebSocketServer()
	private server: WebSocket | undefined;

	private readonly logger = new Logger(WebSocketProvider.name);
	constructor(private sockets: SocketsInjection) {
		this.sockets = sockets;
	}

	@SubscribeMessage(EventList.login)
	handleLogin(
		@MessageBody(new ValidationPipe({ expectedType: MessageInterface }))
		data: MessageInterface,
		@ConnectedSocket() socket: WebSocket
	): MessageInterface {
		if (this.sockets.sockets[data.channel]) {
			for (const socketUserCollection of this.sockets.sockets[data.channel]) {
				if (socketUserCollection.user === data.user) {
					this.logger.warn(
						`Le pseudo ${data.user} est déjà utilisé sur le channel ${data.channel}`
					);
					return {
						user: data.user,
						channel: data.channel,
						state: "warning",
						message: `Le pseudo ${data.user} est déjà utilisé sur le channel ${data.channel}.`,
					};
				}
			}
			this.logger.debug(`${data.user} logged into ${data.channel} channel`);
			this.handleMessage({
				channel: data.channel,
				message: `${data.user} vient d'arriver !`,
				state: "info",
				user: data.user,
			});
			this.sockets.sockets[data.channel].push({
				socket: socket,
				user: data.user,
			});
		} else {
			if (data.channel !== "") {
				this.logger.debug(`${data.user} created ${data.channel} channel`);
				this.sockets.sockets[data.channel] = [
					{
						socket: socket,
						user: data.user,
					},
				];
			} else
				return {
					user: data.user,
					channel: data.channel,
					state: "warning",
					message: "Nom de channel interdit.",
				};
		}
		return {
			user: data.user,
			channel: data.channel,
			state: "info",
			message: "Connection réussie !",
		};
	}

	@SubscribeMessage(EventList.sendTo)
	handleSendTo(
		@MessageBody(new ValidationPipe({ expectedType: AnswerInterface }))
		data: AnswerInterface
		// @ConnectedSocket() socket: WebSocket
	) {
		if (
			this.sockets.sockets[data.channel] &&
			this.sockets.sockets[data.channel].some((c) => c.user === data.user)
		) {
			this.sockets.sockets[data.channel].forEach((socketUserCollection) => {
				if (socketUserCollection.user === data.recipient) {
					socketUserCollection.socket.send(JSON.stringify(data));
				}
			});
		} else {
			this.logger.error(`No channel from ${this.handleSendTo.name}`);
			return {
				user: data.user,
				channel: data.channel,
				state: "error",
				message: "No channel !",
			};
		}
	}

	@SubscribeMessage(EventList.message)
	handleMessage(
		@MessageBody(new ValidationPipe({ expectedType: MessageInterface }))
		data: MessageInterface
		// @ConnectedSocket() socket: WebSocket
	) {
		if (
			this.sockets.sockets[data.channel] &&
			this.sockets.sockets[data.channel].some((c) => c.user === data.user)
		) {
			this.sockets.sockets[data.channel].forEach((socketUserCollection) => {
				socketUserCollection.socket.send(JSON.stringify(data));
			});
		} else {
			this.logger.error(`No channel from ${this.handleMessage.name}`);
			return {
				user: data.user,
				channel: data.channel,
				state: "error",
				message: "No channel !",
			};
		}
	}

	@SubscribeMessage(EventList.leaving)
	handleLeaving(
		@MessageBody(new ValidationPipe({ expectedType: MessageInterface }))
		data: MessageInterface
		// @ConnectedSocket() socket: WebSocket
	) {
		if (
			this.sockets.sockets[data.channel] &&
			this.sockets.sockets[data.channel].some((c) => c.user === data.user)
		) {
			this.logger.debug(`${data.user} leaving`);
			this.sockets.sockets[data.channel].forEach((socketUserCollection) => {
				if (socketUserCollection.user !== data.user) {
					socketUserCollection.socket.send(
						JSON.stringify({
							user: data.user,
							channel: data.channel,
							state: "info",
							message: `${data.user} vient de partir !`,
						} as MessageInterface)
					);
				}
			});
			this.sockets.sockets[data.channel] = this.sockets.sockets[
				data.channel
			].filter(
				(socketUserCollection) => socketUserCollection.user !== data.user
			);
			if (this.sockets.sockets[data.channel].length <= 0) {
				delete this.sockets.sockets[data.channel];
				this.logger.debug(`Channel ${data.channel} has been deleted`);
			}
		} else {
			this.logger.error(`No channel from ${this.handleLeaving.name}`);
			return {
				user: data.user,
				channel: data.channel,
				state: "error",
				message: "No channel !",
			};
		}
	}
}
