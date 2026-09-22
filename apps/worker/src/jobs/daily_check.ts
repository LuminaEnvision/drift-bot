/**
 * Cheap scheduled CVE + CI check. The API runs this in-process via
 * POST /v1/digest/tick. The bot calls that on an hourly timer and sends
 * Telegram messages. Same job can move here when a queue is wired.
 */
export { runAudit } from "@drift-bot/audit-engine";
