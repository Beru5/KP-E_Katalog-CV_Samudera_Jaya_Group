// @ts-nocheck

// Rank Sum
export function calculateRankSumWeights(chosenPriorities = []) {
	const weights = {
		harga: 0,
		km: 0,
		tahun: 0,
		cc: 0,
	};

	const N = chosenPriorities.length;
	if (N === 0) return weights;

	const sumRank = (N * (N + 1)) / 2;

	chosenPriorities.forEach((kriteria, idx) => {
		if (kriteria in weights) {
			const rank = idx + 1;
			weights[kriteria] = (N - rank + 1) / sumRank;
		}
	});

	return weights;
}

// Filter Alternatif
export function filterEligibleItems(items = [], filters = {}) {
	const minPrice = Number.isFinite(filters.minPrice) ? filters.minPrice : 0;
	const maxPrice = Number.isFinite(filters.maxPrice) ? filters.maxPrice : Infinity;
	const minKm = Number.isFinite(filters.minKm) ? filters.minKm : 0;
	const maxKm = Number.isFinite(filters.maxKm) ? filters.maxKm : Infinity;
	const brand = filters.brand || "all";
	const category = filters.category || "all";
	const transmission = filters.transmission || "all";
	const isTaxHidup = Boolean(filters.isTaxHidup);

	return items.filter((item) => {
		const harga = Number(item.harga) || 0;
		const km = Number(item.km) || 0;
		const itemBrand = String(item.brand || "");
		const itemCat = String(item.kategori || "");
		const itemTrans = String(item.transmisi || "");
		const itemTax = String(item.pajak || "").toLowerCase();

		const matchPrice = harga >= minPrice && harga <= maxPrice;
		const matchKm = km >= minKm && km <= maxKm;
		const matchBrand = brand === "all" || itemBrand === brand;
		const matchCat = category === "all" || itemCat === category;
		const matchTrans = transmission === "all" || itemTrans === transmission;
		const matchTax = !isTaxHidup || itemTax.includes("hidup");

		return matchPrice && matchKm && matchBrand && matchCat && matchTrans && matchTax;
	});
}

//  MOORA
export function rankItemsWithMoora(
	eligibleItems = [],
	chosenPriorities = [],
	ccPreference = "besar",
) {
	if (
		!Array.isArray(eligibleItems) ||
		eligibleItems.length === 0 ||
		chosenPriorities.length === 0
	) {
		return [];
	}

	const weights = calculateRankSumWeights(chosenPriorities);

	let sumSqHarga = 0;
	let sumSqKm = 0;
	let sumSqTahun = 0;
	let sumSqCc = 0;

	eligibleItems.forEach((item) => {
		const harga = Number(item.harga) || 0;
		const km = Number(item.km) || 0;
		const tahun = Number(item.tahun) || 0;
		const cc = Number(item.cc) || 0;

		sumSqHarga += harga * harga;
		sumSqKm += km * km;
		sumSqTahun += tahun * tahun;
		sumSqCc += cc * cc;
	});

	const denomHarga = Math.sqrt(sumSqHarga) || 1;
	const denomKm = Math.sqrt(sumSqKm) || 1;
	const denomTahun = Math.sqrt(sumSqTahun) || 1;
	const denomCc = Math.sqrt(sumSqCc) || 1;

	const ranked = eligibleItems.map((item) => {
		const valHarga = Number(item.harga) || 0;
		const valKm = Number(item.km) || 0;
		const valTahun = Number(item.tahun) || 0;
		const valCc = Number(item.cc) || 0;

		const rHarga = valHarga / denomHarga;
		const rKm = valKm / denomKm;
		const rTahun = valTahun / denomTahun;
		const rCc = valCc / denomCc;

		const wHarga = rHarga * weights.harga;
		const wKm = rKm * weights.km;
		const wTahun = rTahun * weights.tahun;
		const wCc = rCc * weights.cc;

		let benefitSum = 0;
		let costSum = 0;

		if (chosenPriorities.includes("tahun")) {
			benefitSum += wTahun;
		}

		if (chosenPriorities.includes("cc")) {
			if (ccPreference === "besar") {
				benefitSum += wCc;
			} else {
				costSum += wCc;
			}
		}

		if (chosenPriorities.includes("harga")) {
			costSum += wHarga;
		}

		if (chosenPriorities.includes("km")) {
			costSum += wKm;
		}

		const yi = benefitSum - costSum;

		return {
			item,
			yi,
			weights,
		};
	});

	return ranked.sort((a, b) => b.yi - a.yi);
}
