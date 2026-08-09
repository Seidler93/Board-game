import { io } from "socket.io-client";
import { getServerOrigin } from "./serverOrigin";

const socket = io(getServerOrigin());

export default socket;
