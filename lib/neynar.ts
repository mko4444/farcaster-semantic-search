import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new NeynarAPIClient(process.env.NEYNAR_KEY ?? "");

export default client;
