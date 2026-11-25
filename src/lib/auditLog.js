import crypto from "node:crypto";
import { pool } from "./db.js";

function hitungHash(payload) {
	return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function catatLog({
	conn = null,
	admin_id = null,
	username = "SYSTEM",
	aksi,
	entitas,
	target_id = null,
	ringkasan,
	data_sebelum = null,
	data_sesudah = null,
	ip_address = null,
}) {
	const db = conn || pool;

	const [lastRows] = await db.query(
		"SELECT current_hash FROM Admin_Audit_Log ORDER BY id_log DESC LIMIT 1",
	);
	const prev_hash = lastRows.length > 0 ? lastRows[0].current_hash : "0".repeat(64);

	const sebelumStr = data_sebelum ? JSON.stringify(data_sebelum) : null;
	const sesudahStr = data_sesudah ? JSON.stringify(data_sesudah) : null;
	const targetStr = target_id !== null ? String(target_id) : null;

	const current_hash = hitungHash({
		prev_hash,
		admin_id,
		username,
		aksi,
		entitas,
		target_id: targetStr,
		ringkasan,
		data_sebelum: sebelumStr,
		data_sesudah: sesudahStr,
		ip_address,
	});

	await db.query(
		`INSERT INTO Admin_Audit_Log 
      (admin_id, username, aksi, entitas, target_id, ringkasan, data_sebelum, data_sesudah, ip_address, prev_hash, current_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			admin_id,
			username,
			aksi,
			entitas,
			targetStr,
			ringkasan,
			sebelumStr,
			sesudahStr,
			ip_address,
			prev_hash,
			current_hash,
		],
	);
}
