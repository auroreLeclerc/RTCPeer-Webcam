import {
	AnswerInterface,
	AnswerInterfaceNoLogin,
	EventList,
	MessageInterface,
	MessageInterfaceNoLogin,
} from "../fullstack/SubscribeMessageType";
import config from "../fullstack/config.json" assert { type: "json" };
import { Webcam } from "../webcam";

abstract class Login {
	protected static _channel: string;
	protected static _user: string;

	setLogin(channel: string, user: string) {
		Login._channel = channel;
		Login._user = user;
	}
}

interface RTCPeerConnectionDict {
	[index: string]: {
		connection: RTCPeerConnection;
		fullfilled: boolean;
	};
}

abstract class IceClient extends Login {
	private readonly rtcPeerConnections: RTCPeerConnectionDict = {};
	private readonly webcams: Webcam[];
	private readonly setWebcams: React.Dispatch<React.SetStateAction<Webcam[]>>;
	public srcObject!: MediaStream;

	constructor(
		webcams: Webcam[],
		setWebcams: React.Dispatch<React.SetStateAction<Webcam[]>>
	) {
		super();
		this.webcams = webcams;
		this.setWebcams = setWebcams;
	}

	abstract sendJSON(
		event: EventList,
		data: MessageInterfaceNoLogin | AnswerInterfaceNoLogin
	): void;

	private sendRtcPeerOffer(newUser: string) {
		if (!this.srcObject) throw new ReferenceError("srcObject is empty !");

		try {
			this.rtcPeerConnections[newUser].connection.addTrack(
				this.srcObject.getVideoTracks()[0],
				this.srcObject
			);
			this.rtcPeerConnections[newUser].connection.addTrack(
				this.srcObject.getAudioTracks()[0],
				this.srcObject
			);
		} catch (error) {
			this.rtcPeerConnections[newUser].fullfilled = false;
			throw new Error(`Already sent ${error}`);
		}
		console.info(this.srcObject.getTracks());

		this.rtcPeerConnections[newUser].connection
			.createOffer()
			.then((offer) =>
				this.rtcPeerConnections[newUser].connection.setLocalDescription(offer)
			)
			.then(() => {
				console.info("Sending RTCPeerOffer to", newUser);
				this.sendJSON(EventList.message, {
					message: `${Login._user} a partagé sa webcam !`,
					state: "success",
				});
				this.sendJSON(EventList.sendTo, {
					type: "RTCPeerOffer",
					recipient: newUser,
					answer:
						this.rtcPeerConnections[
							newUser
						].connection.localDescription?.toJSON(),
				});
			});
	}

	private initializeRTCPeerConnection(newUser: string) {
		if (Object.hasOwnProperty.call(this.rtcPeerConnections, newUser)) {
			if (this.rtcPeerConnections[newUser].fullfilled) {
				throw new Error(`${newUser} is already fullfilled`);
			} else this.rtcPeerConnections[newUser].fullfilled = true;
		} else {
			this.rtcPeerConnections[newUser] = {
				connection: new RTCPeerConnection(),
				fullfilled: false,
			};
			this.rtcPeerConnections[newUser].connection.addEventListener(
				"icecandidate",
				(event) => {
					if (event.candidate) {
						console.info(
							"Sending new IceCandidate to",
							newUser,
							event.candidate
						);
						this.sendJSON(EventList.sendTo, {
							type: "IceCandidate",
							recipient: newUser,
							answer: event.candidate.toJSON(),
						});
					}
				}
			);
			this.rtcPeerConnections[newUser].connection.ontrack = (event) => {
				if (event.track.kind === "audio") {
					console.log("Received audio MediaStreamTrack from", newUser);
					// TODO: integrate a distinct audio stream with an audio tag if time remains
				} else {
					if (event.streams.length <= 0) throw new Error("Streams are empty !");
					this.setWebcams((currentWebcams) => [
						...currentWebcams,
						{
							name: newUser,
							muted: false,
							video: event.streams[0],
						},
					]);
					console.info("New stream added in DOM");
				}
			};
			this.rtcPeerConnections[newUser].connection.oniceconnectionstatechange =
				() => {
					if (
						this.rtcPeerConnections[newUser].connection.iceConnectionState ===
						"disconnected"
					) {
						// this.streamClosing(newUser);
						this.setWebcams((currentWebcams) =>
							currentWebcams.filter((w) => w.name !== newUser)
						);
						this.rtcPeerConnections[newUser].connection.close();
						delete this.rtcPeerConnections[newUser];
					}
				};
			console.info(`${newUser} added in RTCPeerConnectionDict`);
		}
	}

	closeAll() {
		for (const rtcPeerConnection in this.rtcPeerConnections) {
			if (
				Object.prototype.hasOwnProperty.call(
					this.rtcPeerConnections,
					rtcPeerConnection
				)
			) {
				this.rtcPeerConnections[rtcPeerConnection].connection.close();
			}
		}
	}

	sendVideo() {
		fetch(
			new URL(
				`http://${config.backend.http.ip}:${config.backend.http.port}/API/users?channel=${Login._channel}`
			)
		).then((response) => {
			response.json().then((users) => {
				users.forEach((user: string) => {
					if (user !== Login._user) {
						this.initializeRTCPeerConnection(user);
						this.sendRtcPeerOffer(user);
					}
				});
			});
		});
	}

	peerOffer(offer: RTCSessionDescription, newUser: string) {
		this.initializeRTCPeerConnection(newUser);

		this.rtcPeerConnections[newUser].connection
			.setRemoteDescription(offer)
			.then(() => {
				this.rtcPeerConnections[newUser].connection
					.createAnswer()
					.then((answer) => {
						this.rtcPeerConnections[newUser].connection
							.setLocalDescription(answer)
							.then(() => {
								this.sendJSON(EventList.sendTo, {
									type: "RTCPeerAnswer",
									recipient: newUser,
									answer:
										this.rtcPeerConnections[
											newUser
										].connection.localDescription?.toJSON(),
								});
							});
					});
			})
			.catch((error) => console.error(error, offer));
	}

	peerAnswer(answer: RTCSessionDescription, newUser: string) {
		if (!Object.hasOwnProperty.call(this.rtcPeerConnections, newUser)) {
			throw new ReferenceError(
				`${newUser} is not in ${this.rtcPeerConnections}`
			);
		} else {
			this.rtcPeerConnections[newUser].connection
				.setRemoteDescription(answer)
				.then(() => console.info("RTCPeerConnection established with", newUser))
				.catch((error) => console.error(error, newUser, answer));
		}
	}

	newCandidate(candidate: RTCIceCandidate, newUser: string) {
		this.rtcPeerConnections[newUser].connection
			.addIceCandidate(candidate)
			.then(() => console.info("IceCandidate added of", newUser))
			.catch((error) =>
				console.error(
					error,
					candidate,
					this.rtcPeerConnections[newUser].connection.localDescription
				)
			);
	}
}

export class WssClient extends IceClient {
	private socket!: WebSocket;

	constructor(
		webcams: Webcam[],
		setWebcams: React.Dispatch<React.SetStateAction<Webcam[]>>,
		chat: (message: MessageInterface) => void
	) {
		super(webcams, setWebcams);
		const url = new URL(
			`ws://${config.backend.ws.ip}:${config.backend.ws.port}/`
		);
		this.socket = new WebSocket(url);
		this.start(chat);
	}

	/**
	 * @description WebSocket.send a String from a JSON
	 * @note Autocompletion with current channel and user
	 */
	sendJSON(
		event: EventList,
		data: MessageInterfaceNoLogin | AnswerInterfaceNoLogin
	) {
		this.socket.send(
			JSON.stringify({
				event: event,
				data: Object.assign(
					{
						channel: Login._channel,
						user: Login._user,
					},
					data
				),
			})
		);
	}

	private start(chat: (message: MessageInterface) => void) {
		this.socket.onmessage = (message) => {
			const data = JSON.parse(message.data) as
				| MessageInterface
				| AnswerInterface;
			if ("answer" in data) {
				Object.setPrototypeOf(data, AnswerInterface.prototype);
				console.log(`Received : ${data.type}`);
			} else if ("message" in data) {
				Object.setPrototypeOf(data, MessageInterface.prototype);
				console.log(`Received : ${data.state}`);
			}

			if (data instanceof MessageInterface) {
				chat(data);
			} else if (data instanceof AnswerInterface) {
				switch (data.type) {
				case "IceCandidate":
					this.newCandidate(
						new RTCIceCandidate(data.answer as RTCIceCandidateInit),
						data.user
					);
					break;
				case "RTCPeerAnswer":
					this.peerAnswer(
						new RTCSessionDescription(
								data.answer as RTCSessionDescriptionInit
						),
						data.user
					);
					break;
				case "RTCPeerOffer":
					this.peerOffer(
						new RTCSessionDescription(
								data.answer as RTCSessionDescriptionInit
						),
						data.user
					);
					break;
				default:
					throw new TypeError(JSON.stringify(data));
				}
			} else throw new TypeError(JSON.stringify(data));
		};
		this.socket.onerror = () => {
			chat({
				user: WssClient._user,
				channel: WssClient._channel,
				state: "error",
				message: "Impossible de communiquer avec le serveur",
			});
		};
	}
}
