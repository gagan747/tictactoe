import { io } from "socket.io-client";
import hostname from "./config";
export const socket = io(hostname);