export const id = "VAL_P82TOXA";
export const name = "Import PICO-8 Sound Effect";
export const groups = ["EVENT_GROUP_MUSIC"];

const instrument_to_duty = [2,3,0,2,1,1,0,1];
// This is just my *guess* as to which instruments fit which duty cycles better.

const CH2Freqs = [44,156,262,363,457,547,631,710,786,854,923,986,1046,1102,1155,1205,1253,1297,1339,1379,1417,1452,1486,1517,1546,1575,1602,1627,1650,1673,1694,1714,1732,1750,1767,1783,1798,1812,1825,1837,1849,1860,1871,1881,1890,1899,1907,1915,1923,1930,1936,1943,1949,1954,1959,1964,1969,1974,1978,1982,1985,1988,1992,1995,1998,2001,2004,2006,2009,2011,2013,2015];

function hashCode(s) {
    for(var i = 0, h = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h;
}

function toHex(n){
	return "0x" + n.toString(16);
}

export const fields = [
	{
		key: "clip",
		label: "SFX Clipboard",
		width: "150%",
		type: "text",
		defaultValue: "",
	},
	{
		key: "pri",
		label: "Priority",
		type: "select",
		options: [
			[0, "Minimal"],
			[7, "Normal"],
			[15,"High"]
		],
		defaultValue: 7,
	},
];

export const compile = (input, helpers) => {
  const {
    writeAsset,
    appendRaw,
    _addComment,
    _addDependency,
    _getAvailableSymbol,
  } = helpers;

	const str = input.clip;
	const pri = input.pri;
	var str_counter = 11;

	const hash = hashCode(str).toString(16).toUpperCase().replace("-","_");

	const symbol = `SFX_${hash}`;
	const bank = `___bank_${symbol}`;

	var buffer = "";

	if(str.substr(0,5) != "[sfx]"){
		// Replace this with an ERROR helper if such thing exists
		warnings(`[ERROR] : String is not a valid SFX.`);
	};

	var speed = parseInt(str.substr(-12,2),16);

	if(speed > 1){
		speed = speed << 1;
	}

	if(speed > 15){
		warnings(`SFX Speed is ${speed}, speed can't be higher than 7.`);
	}

	// 138 = 128 sfx nibbles + start bracket header + 6 nibble header
	while(str_counter < 138){
		var byte_A = parseInt(str.substr(str_counter, 2), 16);
		str_counter += 2;
		var byte_B = parseInt(str.substr(str_counter, 2), 16);
		str_counter += 2;

		var note = byte_A & 63;
		var ins = (byte_B & 1) | ((byte_A & 192) >> 6);
		var vol = (byte_B & 14) >> 1;

		// COUNT
		//warnings((speed << 4) | 1);
		buffer += toHex((speed << 4) | 1) + ", ";

		// COMMAND
		//warnings(0b01111001); // Load NR21-NR24
		buffer += "0b01111001, ";

		// REGS
		//warnings(instrument_to_duty[ins] << 6); // NR21
		buffer += toHex(instrument_to_duty[ins] << 6) + ", ";

		//warnings(vol << 5); // NR22
		buffer += toHex(vol << 5) + ", ";

		//warnings(CH2Freqs[note] & 255); // NR23
		buffer += toHex(CH2Freqs[note] & 255) + ", ";

		//warnings(128 | (CH2Freqs[note] >> 8)); // NR24
		buffer += toHex(128 | (CH2Freqs[note] >> 8)) + ",\n";

	};
		
		buffer += "0x02, 0b01111001, 0x00, 0x00, 0x00, 0x00, 0x07" // Last call, clean up CH2 and add terminator value

		writeAsset(`${symbol}.c`, SFX_C(symbol, buffer));
		writeAsset(`${symbol}.h`, SFX_H(symbol));

		appendRaw(`VM_SFX_PLAY ${bank}, _${symbol}, 0b1011, ${pri}`);
};

const SFX_C = (symbol,buffer) => {
  return `#pragma bank 255
// SFX
#include "gbs_types.h"
BANKREF(${symbol})
const unsigned char ${symbol}[] = {
${buffer}
};
`;
};

const SFX_H = (symbol) => {
  return `#ifndef ${symbol}_H
#define ${symbol}_H
// SFX
#include "gbs_types.h"
BANKREF_EXTERN(${symbol})
extern const unsigned char ${symbol}[];
#endif
`;
};