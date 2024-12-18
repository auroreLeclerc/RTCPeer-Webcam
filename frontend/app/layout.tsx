import type { Metadata } from "next";
import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { theme } from "./misc/theme";

export const metadata: Metadata = {
	title: "RTCPeer-Webcam",
	description: "Webcam video exchange using RTCPeerConnection and WebSocket built with React/NextJS and NestJS"
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="fr">
			<head>
				<meta name="viewport" content="initial-scale=1, width=device-width" />
			</head>
			<body>
				<AppRouterCacheProvider>
					<ThemeProvider theme={theme}>{children}</ThemeProvider>
				</AppRouterCacheProvider>
			</body>
		</html>
	);
}
