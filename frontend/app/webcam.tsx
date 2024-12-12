"use client";
import {
	Alert,
	Autocomplete,
	Avatar,
	Box,
	Button,
	Card,
	CircularProgress,
	Divider,
	ImageList,
	ImageListItem,
	ImageListItemBar,
	InputAdornment,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import {
	AccountCircle,
	AdminPanelSettings,
	Chat,
	Group,
	VideocamOff,
	VolumeOff,
	VolumeUp,
} from "@mui/icons-material";
import { WssClient } from "./misc/Client";
import config from "./fullstack/config.json";
import { MessageInterface, EventList } from "./fullstack/SubscribeMessageType";

export interface Webcam {
	local?: boolean;
	name: string;
	muted: boolean;
	video: MediaStream | null;
}
export interface Channel {
	open: boolean;
	loading: boolean;
	readonly channels: string[];
}
export interface FormData {
	user: string;
	userError: boolean;
	channel: string;
	channelError: boolean;
}

function stringToColour(input: string) {
	let hash = 0;
	input.split("").forEach((char) => {
		hash = char.charCodeAt(0) + ((hash << 5) - hash);
	});
	let colour = "#";
	for (let i = 0; i < 3; i++) {
		const value = (hash >> (i * 8)) & 0xff;
		colour += value.toString(16).padStart(2, "0");
	}
	return colour;
}

export default function Webcam() {
	const [webcams, setWebcams] = useState<Webcam[]>([
		{ local: true, name: "🙋", muted: false, video: null },
	]);
	useEffect(() => {
		const chat = (message: MessageInterface) => {
			if (!connectionSuccess.current) {
				if (
					message.message === "Connection réussie !" &&
					message.state === "info"
				) {
					setFormData({
						user: message.user,
						userError: false,
						channel: message.channel,
						channelError: false,
					});
					connectionSuccess.current = true;
				} else if (
					message.message.startsWith("Le pseudo") &&
					message.state === "warning"
				) {
					setFormData({
						...formData,
						userError: true,
					});
				} else if (
					message.message == "Nom de channel interdit." &&
					message.state === "warning"
				) {
					setFormData({
						...formData,
						channelError: true,
					});
				} else {
					setFormData({
						...formData,
						userError: true,
						channelError: true,
					});
				}

				if (
					!connectionSuccess.current &&
					wssClient.current instanceof WssClient
				)
					wssClient.current.setLogin("", "");
			}
			setMessages((currentMessages) => [
				...currentMessages,
				{
					state: message.state,
					user: message.user,
					message: message.message,
					channel: message.channel,
				},
			]);
		};
		wssClient.current = new WssClient(webcams, setWebcams, chat);
		navigator.mediaDevices
			.getUserMedia({
				video: {
					width: 800,
					height: 600,
					frameRate: {
						ideal: 25,
						max: 30,
					},
				},
				audio: true,
			})
			.then((mediaStream) => {
				if (wssClient.current instanceof WssClient)
					wssClient.current.srcObject = mediaStream;
				setWebcams((currentWebcams) =>
					currentWebcams.map((w) =>
						w.local
							? {
								local: true,
								name: w.name,
								muted: false,
								video: mediaStream,
							}
							: w
					)
				);
			})
			.catch((error) => {
				if (
					error.name === "NotAllowedError" ||
					error.name === "NotFoundError"
				) {
					console.warn("Webcam", error.message);
					setMessages((currentMessages) => [
						...currentMessages,
						{
							state: "warning",
							user: formData.user,
							message: "Accès à la webcam refusé.",
							channel: formData.channel,
						},
					]);
					setWebcams((currentWebcams) =>
						currentWebcams.map((w) =>
							w.local
								? {
									local: true,
									name: w.name,
									muted: true,
									video: null,
								}
								: w
						)
					);
				} else {
					throw error;
				}
			});

		const handleBeforeUnload = () => {
			if (wssClient.current instanceof WssClient) {
				wssClient.current.closeAll();
				wssClient.current.sendJSON(EventList.leaving, {
					state: "info",
					message: "handshake",
				});
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [channels, setChannels] = React.useState<Channel>({
		open: false,
		loading: false,
		channels: [],
	});
	const handleOpen = () => {
		setChannels({
			open: true,
			loading: true,
			channels: [],
		});
		fetch(
			new URL(
				`http://${config.backend.http.ip}:${config.backend.http.port}/API/channels`
			)
		)
			.then((response) => {
				response.json().then((json) => {
					setChannels({
						open: true,
						loading: false,
						channels: json,
					});
				});
			})
			.catch(() => {
				setMessages((currentMessages) => [
					...currentMessages,
					{
						state: "warning",
						user: formData.user,
						message: "Serveur inaccessible !",
						channel: formData.channel,
					},
				]);
			});
	};
	const handleClose = () => {
		setChannels({
			loading: false,
			open: false,
			channels: [],
		});
	};
	const [messages, setMessages] = useState<MessageInterface[]>([]);
	const [formData, setFormData] = useState<FormData>({
		user: "",
		userError: false,
		channel: "",
		channelError: false,
	});
	const [formMessage, setformMessage] = useState("");
	const wssClient = useRef<WssClient | null>(null);
	const connectionSuccess = useRef<boolean>(false);
	return (
		<Stack
			direction="row"
			spacing={1}
			sx={{
				justifyContent: "space-around",
				alignItems: "center",
				height: "100%",
				width: "100%",
			}}
		>
			<Stack
				direction="column"
				spacing={1}
				sx={{
					justifyContent: "space-evenly",
					alignItems: "center",
					height: "100%",
					width: "75%",
					flexGrow: 2,
				}}
			>
				<ImageList
					sx={{
						display: "flex",
						flexFlow: "row wrap",
						justifyContent: "space-around",
						alignItems: "center",
						flexGrow: 2,
					}}
				>
					{webcams.map((webcam) => {
						return (
							<ImageListItem key={webcam.name}>
								{webcam.video ? (
									<video
										style={{
											maxWidth: "400px",
											maxHeight: "400px",
										}}
										ref={(video) => {
											if (video) {
												video.muted = Boolean(webcam.local)
													? true
													: webcam.muted;
												video.controls = false;
												video.autoplay = true;
												video.srcObject = webcam.video;
											}
										}}
									/>
								) : (
									<VideocamOff
										sx={{
											width: "100%",
											height: "auto",
										}}
									/>
								)}
								{webcam.local ? (
									<ImageListItemBar title={webcam.name}></ImageListItemBar>
								) : (
									<ImageListItemBar
										title={webcam.name}
										onClick={() =>
											setWebcams((currentWebcams) =>
												currentWebcams.map((w) =>
													w.name === webcam.name
														? {
															...w,
															muted: !w.muted,
														}
														: w
												)
											)
										}
										actionIcon={webcam.muted ? <VolumeOff /> : <VolumeUp />}
									/>
								)}
							</ImageListItem>
						);
					})}
				</ImageList>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (wssClient.current instanceof WssClient) {
							wssClient.current.setLogin(formData.channel, formData.user);
							wssClient.current.sendJSON(EventList.login, {
								state: "info",
								message: "handshake",
							});
						}
						setWebcams(
							webcams.map((w) => (w.local ? { ...w, name: formData.user } : w))
						);
						console.log(`Trying login with ${JSON.stringify(formData)}`);
					}}
					style={{ width: "100%" }}
				>
					<Stack
						direction="row"
						spacing={1}
						sx={{
							justifyContent: "space-around",
							alignItems: "center",
							flexFlow: "row nowrap",
						}}
					>
						<TextField
							label="Nom d'utilisateur·rice"
							variant="outlined"
							required
							slotProps={{
								input: {
									startAdornment: (
										<InputAdornment position="start">
											<AccountCircle />
										</InputAdornment>
									),
								},
							}}
							error={formData.userError}
							disabled={connectionSuccess.current}
							onChange={(event) =>
								setFormData({
									...formData,
									user: event.target.value,
								})
							}
							value={formData.user}
							sx={{ flexGrow: 1 }}
						/>
						<Autocomplete
							freeSolo
							open={channels.open}
							onOpen={handleOpen}
							onClose={handleClose}
							options={channels.channels}
							loading={channels.loading}
							disabled={connectionSuccess.current}
							onInputChange={(event, newInputValue) =>
								setFormData({
									...formData,
									channel: newInputValue,
								})
							}
							inputValue={formData.channel}
							renderInput={(params) => (
								<TextField
									{...params}
									label="Nom du channel à rejoindre ou créer"
									required
									slotProps={{
										input: {
											...params.InputProps,
											startAdornment: (
												<InputAdornment position="start">
													<Group />
												</InputAdornment>
											),
											endAdornment: (
												<InputAdornment position="end">
													{channels.loading ? (
														<CircularProgress color="inherit" />
													) : null}
												</InputAdornment>
											),
										},
									}}
									error={formData.channelError}
									disabled={connectionSuccess.current}
									onChange={(event) =>
										setFormData({
											...formData,
											channel: event.target.value,
										})
									}
									value={formData.channel}
								/>
							)}
							sx={{ flexGrow: 1 }}
						/>
						<Button
							variant="outlined"
							type="submit"
							disabled={connectionSuccess.current}
						>
							Rentrer dans le channel
						</Button>
						<Button
							variant="contained"
							onClick={() => {
								if (wssClient.current instanceof WssClient)
									wssClient.current.sendVideo();
							}}
							disabled={webcams[0].video === null}
						>
							Partager sa webcam
						</Button>
					</Stack>
				</form>
			</Stack>
			<Divider orientation="vertical" flexItem />
			<Stack
				direction="column"
				spacing={1}
				sx={{
					justifyContent: "stretch",
					alignItems: "center",
					height: "100%",
					width: "25%",
				}}
			>
				<Box
					sx={{
						height: "100%",
						width: "100%",
						overflowY: "scroll",
					}}
				>
					{messages.map((message) => {
						return (
							<Card
								sx={{
									display: "flex",
									flexDirection:
										message.state === "user" && message.user === formData.user
											? "row"
											: "row-reverse",
									justifyContent: "space-evenly",
									alignItems: "center",
									margin: "5px 0 5px 0",
								}}
								key={crypto.randomUUID()}
							>
								{(() => {
									if (message.state === "user") {
										return (
											<Typography
												variant="caption"
												sx={{
													wordBreak: "break-all",
												}}
											>
												{message.message}
											</Typography>
										);
									} else {
										return (
											<Alert variant="filled" severity={message.state}>
												{message.message}
											</Alert>
										);
									}
								})()}
								{message.state !== "user" ? (
									<AdminPanelSettings />
								) : (
									<Avatar
										sx={{
											bgcolor: stringToColour(message.user),
										}}
										title={message.user}
									>
										{message.user
											.split(" ")
											.reduce(
												(accumulator, currentValue) =>
													accumulator.length >= 2
														? ""
														: accumulator + currentValue[0].toUpperCase(),
												""
											)}
									</Avatar>
								)}
							</Card>
						);
					})}
				</Box>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (wssClient.current instanceof WssClient)
							wssClient.current.sendJSON(EventList.message, {
								state: "user",
								message: formMessage,
							});
						setformMessage("");
					}}
				>
					<Stack
						direction="row"
						spacing={1}
						sx={{
							justifyContent: "space-around",
							alignItems: "center",
							width: "100%",
						}}
					>
						<TextField
							label="Message"
							variant="outlined"
							required
							slotProps={{
								input: {
									startAdornment: (
										<InputAdornment position="start">
											<Chat />
										</InputAdornment>
									),
								},
							}}
							onChange={(event) => setformMessage(event.target.value)}
							value={formMessage}
						/>
						<Button variant="outlined" type="submit">
							Envoyer
						</Button>
					</Stack>
				</form>
			</Stack>
		</Stack>
	);
}
