export const id = "EVENT_MAX_SFX";
export const name = "Import Maximum SFX";
export const groups = ["MAX","EVENT_GROUP_MUSIC"];

const channels = ["Channel 1", "Channel 2", "Channel 3", "Channel 4"];

function hashCode(s) {
    for(var i = 0, h = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h;
}

function toHex(n){
	return "0x" + (n& 255).toString(16);
}

export const fields = [
  {
    key: "channels",
    label: "Channel",
    type: "togglebuttons",
    options: [
      [1, "Channel 1"],
      [2, "Channel 2"],
      [3, "Channel 3"],
      [4, "Channel 4"],
    ],
    allowMultiple: false,
    allowNone: false,
  },
  {
    key: "length",
    label: "Duration",
    type: "slider",
    min: 1,
    max: 60,
    defaultValue: 8,
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
  {
    key: "hex",
    label:"Sound Hex",
    type: "text",
    defaultValue: "0x16, 0x40, 0x73, 0x00, 0xC3",
  },
];

export const compile = (input, helpers) => {
  const {
    writeAsset,
    appendRaw,
    warnings,
    _addComment,
    _addDependency,
    _getAvailableSymbol,
  } = helpers;
  var length = input.length;
  const channels = input.channels;
  const hex = input.hex;
  const pri = input.pri;

	const hash = hashCode(hex).toString(16).toUpperCase().replace("-","_");

	const symbol = `SFX_${hash}`;
	const bank = `___bank_${symbol}`;

	var buffer = "";
	var command = 0;
	var len_counter = 0;
	var mask = 0;

	// Convert speed
	// Because the driver runs at 256hz, to update in frames we multiply the length by 4
	length <<= 2;

	if(length > 15){
		len_counter = length;
	}
	warnings(channels)
	// Get the correct COMMAND
	switch(channels) {
	  case 1:
	    command = 0b11111000;
	    mask = 0b0111;
	    break;
	  case 2:
	    command = 0b01111001;
	    mask = 0b1011;
	    break;
	  case 3:
	    command = 0b11111010;
	    mask = 0b1101;
	    break;
	  case 4:
	    command = 0b01111011;
	    mask = 0b1110;
	    break;
	  default:
	  	// Idk
	}
	// Add header
	buffer += `${toHex((length<<4) | 1)}, ${toHex(command)}, ${hex},\n`;

	while(len_counter > 15){
		buffer += `${toHex((length<<4) | 1)}, 0,\n`;
		len_counter -= 15;
	}
	if(len_counter > 0){
		buffer += `${toHex((len_counter<<4) | 1)}, 0,\n`;
	}

	// Terminate sequence
	buffer += "0x01, 0x07";

	writeAsset(`${symbol}.c`, SFX_C(symbol, buffer));
	writeAsset(`${symbol}.h`, SFX_H(symbol));

	appendRaw(`VM_SFX_PLAY ${bank}, _${symbol}, ${mask}, ${pri}`);

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