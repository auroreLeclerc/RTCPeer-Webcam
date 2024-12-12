import { WebSocket } from "ws";
import { Injectable } from "@nestjs/common";

interface SocketsDict {
	[channel: string]: {
		socket: WebSocket;
		user: string;
	}[];
}

@Injectable()
export class SocketsInjection {
	public readonly sockets: SocketsDict = {};

	getChannels(): string[] {
		const channels: string[] = [];
		for (const channel in this.sockets) {
			if (Object.hasOwnProperty.call(this.sockets, channel)) {
				channels.push(channel);
			}
		}
		return channels;
	}

	getUsers(channel: string): string[] {
		const users: string[] = [];
		this.sockets[channel]?.forEach((user) => {
			users.push(user.user);
		});
		return users;
	}
}
