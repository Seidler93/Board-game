const DEV_SERVER_PORT = "48731";
const DEV_CLIENT_PORTS = new Set(["5173", "5174", "5175"]);

export function getServerOrigin() {
  if (DEV_CLIENT_PORTS.has(window.location.port)) {
    return `${window.location.protocol}//${window.location.hostname}:${DEV_SERVER_PORT}`;
  }

  return window.location.origin;
}
