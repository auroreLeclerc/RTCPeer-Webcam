export enum EventList {
	login = "login",
	leaving = "leaving",
	message = "message",
	sendTo = "sendTo",
}

export class NestWsMessageInterface {
	event!: EventList;
	data!: MessageInterface | AnswerInterface;
}

export class AnswerInterfaceNoLogin {
	type!: "RTCPeerOffer" | "RTCPeerAnswer" | "IceCandidate";
	recipient!: string;
	answer!: unknown;
}

export class AnswerInterface extends AnswerInterfaceNoLogin {
	channel!: string;
	user!: string;
}

export class MessageInterfaceNoLogin {
	state!: "user" | "warning" | "error" | "info" | "success";
	message!: string;
}

export class MessageInterface extends MessageInterfaceNoLogin {
	channel!: string;
	user!: string;
}
