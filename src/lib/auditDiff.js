// src/lib/auditDiff.js

const FIELD_LABELS = {
	brand_mobil: "Brand Mobil",
	model_mobil: "Model Mobil",
	harga: "Harga (Rp)",
	tahun_mobil: "Tahun Mobil",
	kapasitas_mesin: "Kapasitas Mesin (CC)",
	digit_tampil: "Digit Depan Harga",
	kategori_mobil: "Kategori Mobil",
	transmisi: "Transmisi",
	warna_mobil: "Warna Mobil",
	status_pajak: "Status Pajak",
	jumlah_km: "Jumlah KM",
	deskripsi_mobil: "Deskripsi Mobil",
	gambar_mobil: "Foto / Gambar Mobil",
	bukti_penjualan: "Bukti Penjualan",
	status: "Status",
};

function parseJsonSafe(raw) {
	if (!raw) return null;
	if (typeof raw === "object") return raw;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

function normalizeImages(val) {
	const parsed = parseJsonSafe(val);
	if (Array.isArray(parsed)) return parsed;
	if (typeof parsed === "string" && parsed.trim() !== "") return [parsed];
	return [];
}

export function formatFieldValue(fieldKey, val) {
	if (val === null || val === undefined || val === "") return "-";

	if (fieldKey === "harga") {
		const num = Number(val);
		if (!Number.isNaN(num)) {
			return `Rp ${num.toLocaleString("id-ID")}`;
		}
	}

	if (fieldKey === "jumlah_km") {
		const num = Number(val);
		if (!Number.isNaN(num)) {
			return `${num.toLocaleString("id-ID")} KM`;
		}
	}

	if (fieldKey === "kapasitas_mesin") {
		return `${val} CC`;
	}

	if (fieldKey === "gambar_mobil") {
		const imgs = normalizeImages(val);
		if (imgs.length === 0) return "Tidak ada foto";
		return `${imgs.length} file (${imgs.map((p) => String(p).split("/").pop()).join(", ")})`;
	}

	if (typeof val === "object") {
		return JSON.stringify(val);
	}

	return String(val);
}

export function buildFieldDiff(sebelumRaw, sesudahRaw) {
	const sebelum = parseJsonSafe(sebelumRaw);
	const sesudah = parseJsonSafe(sesudahRaw);

	if (!sebelum && !sesudah) return [];

	// Jika hanya ada data_sesudah (misalnya CREATE)
	if (!sebelum && sesudah && typeof sesudah === "object") {
		return Object.keys(sesudah)
			.filter((k) => k !== "id_mobil")
			.map((key) => ({
				key,
				label: FIELD_LABELS[key] || key,
				before: "-",
				after: formatFieldValue(key, sesudah[key]),
				afterImages: key === "gambar_mobil" ? normalizeImages(sesudah[key]) : [],
				beforeImages: [],
				changed: true,
			}));
	}

	// Jika hanya ada data_sebelum (misalnya DELETE_PERMANENT)
	if (sebelum && !sesudah && typeof sebelum === "object") {
		return Object.keys(sebelum)
			.filter((k) => k !== "id_mobil")
			.map((key) => ({
				key,
				label: FIELD_LABELS[key] || key,
				before: formatFieldValue(key, sebelum[key]),
				after: "Dihapus",
				beforeImages: key === "gambar_mobil" ? normalizeImages(sebelum[key]) : [],
				afterImages: [],
				changed: true,
			}));
	}

	// Jika keduanya ada (misalnya UPDATE atau MARK_MOBIL_SOLD)
	const allKeys = Array.from(
		new Set([...Object.keys(sebelum || {}), ...Object.keys(sesudah || {})]),
	).filter((k) => k !== "id_mobil");

	return allKeys.map((key) => {
		const rawBefore = sebelum ? sebelum[key] : undefined;
		const rawAfter = sesudah ? sesudah[key] : undefined;

		const isImageField = key === "gambar_mobil" || key === "bukti_penjualan";
		const normBefore = isImageField
			? JSON.stringify(normalizeImages(rawBefore))
			: JSON.stringify(rawBefore ?? null);
		const normAfter = isImageField
			? JSON.stringify(normalizeImages(rawAfter))
			: JSON.stringify(rawAfter ?? null);

		const changed = normBefore !== normAfter;

		return {
			key,
			label: FIELD_LABELS[key] || key,
			before: formatFieldValue(key, rawBefore),
			after: formatFieldValue(key, rawAfter),
			beforeImages: key === "gambar_mobil" ? normalizeImages(rawBefore) : [],
			afterImages: key === "gambar_mobil" ? normalizeImages(rawAfter) : [],
			changed,
		};
	});
}
