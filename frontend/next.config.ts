import type { NextConfig } from "next";
import config from "./app/fullstack/config.json" assert { type: "json" };
import path from "node:path";

const nextConfig: NextConfig = config.frontend.startNextAsFront
	? {}
	: {
		output: "export",
		distDir: "../out/",
		basePath: path.join(process.cwd(), "..", "out"),
		webpack: (config) => {
			config.optimization.splitChunks = {
				maxSize: 2 ^ 53,
			};

			return config;
		},
	};
export default nextConfig;
