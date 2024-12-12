"use client";

import React, { useState } from "react";
import {
	AppBar,
	Box,
	Tabs,
	Tab,
	Stack,
	Card,
	CardMedia,
	CardContent,
	Typography,
} from "@mui/material";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import VideoChatIcon from "@mui/icons-material/VideoChat";
import Webcam from "./webcam";

export default function Home() {
	const [value, setValue] = useState(0);
	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};
	interface TabPanelProps {
		children?: React.ReactNode;
		index: number;
		value: number;
	}
	function CustomTabPanel(props: TabPanelProps) {
		const { children, value, index } = props;
		return (
			<Box
				width="calc(100vw - 17px)"
				hidden={value !== index}
				sx={{ flexGrow: 2 }}
			>
				{children}
			</Box>
		);
	}

	return (
		<Stack
			height={"calc(100vh - 17px)"}
			direction="column"
			spacing={1}
			sx={{
				justifyContent: "space-around",
				alignItems: "center",
			}}
		>
			<AppBar position="static">
				<Tabs
					value={value}
					onChange={handleChange}
					textColor="inherit"
					indicatorColor="secondary"
					centered
				>
					<Tab icon={<VideoChatIcon />} label="Chat Vidéo" />
					<Tab icon={<AutoStoriesIcon />} label="Documentation" />
				</Tabs>
			</AppBar>
			<CustomTabPanel value={value} index={0}>
				<Webcam />
			</CustomTabPanel>
			<CustomTabPanel value={value} index={1}>
				<Stack
					direction="row"
					spacing={1}
					sx={{
						justifyContent: "space-around",
						alignItems: "center",
					}}
				>
					<Card>
						<CardMedia
							component="img"
							image={"/puml/webSocket.svg"}
							alt="UML"
						/>
						<CardContent>
							<Typography variant="h5">UML</Typography>
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Représentation des échanges réseaux permettant un échange vidéo
								client à client.
							</Typography>
						</CardContent>
					</Card>
				</Stack>
			</CustomTabPanel>
		</Stack>
	);
}
