import keccak256 from "keccak256";
import _isEqual from "lodash/isEqual";
import _range from "lodash/range";
import _uniqWith from "lodash/uniqWith";

import {
  StorageLayoutDiff,
  StorageLayoutDiffType,
  StorageLayoutReportExact,
  StorageVariableDetails,
  StorageVariableExact,
} from "./types";

export const STORAGE_WORD_SIZE = 32n;
export const ZERO_BYTE = "".padStart(64, "0");

interface StorageBytesMapping {
  [byte: string]: StorageVariableDetails;
}

const getStorageVariableBytesMapping = (
  layout: StorageLayoutReportExact,
  variable: StorageVariableExact,
  startByte: bigint
): StorageBytesMapping => {
  const varType = layout.types[variable.type];

  let slot = 0n;
  let example = {};
  switch (varType.encoding) {
    case "dynamic_array":
      slot = BigInt("0x" + keccak256("0x" + variable.slot.toString(16)).toString("hex")); // slot of the element at index 0
      example = getStorageVariableBytesMapping(
        layout,
        {
          ...variable,
          slot,
          offset: 0n,
          type: varType.base!,
          label: variable.label.replace("[]", "[0]"),
        },
        startByte + slot * STORAGE_WORD_SIZE
      );
      break;
    case "mapping":
      slot = BigInt(
        "0x" + keccak256("0x" + ZERO_BYTE + variable.slot.toString(16)).toString("hex")
      ); // slot of the element at key 0
      example = getStorageVariableBytesMapping(
        layout,
        {
          ...variable,
          slot,
          offset: 0n,
          type: varType.value!,
          label: `${variable.label}[0]`,
        },
        startByte + slot * STORAGE_WORD_SIZE
      );
      break;
    default:
      break;
  }

  const details: StorageVariableDetails = {
    ...variable,
    fullLabel: variable.parent
      ? `(${variable.parent.typeLabel})${variable.parent.label}.${variable.label}`
      : variable.label,
    typeLabel: varType.label.replace(/struct /, ""),
    startByte,
  };

  if (!varType.members)
    return {
      ...example,
      ...Object.fromEntries(
        _range(Number(varType.numberOfBytes.toString())).map((byteIndex) => [
          startByte + BigInt(byteIndex),
          details,
        ])
      ),
    };

  return varType.members.reduce(
    (acc, member) => ({
      ...acc,
      ...getStorageVariableBytesMapping(
        layout,
        {
          ...member,
          parent: details,
          slot: details.slot + member.slot,
        },
        startByte + member.slot * STORAGE_WORD_SIZE + member.offset
      ),
    }),
    {}
  );
};

const getStorageBytesMapping = (layout: StorageLayoutReportExact): StorageBytesMapping =>
  layout.storage.reduce(
    (acc, variable) => ({
      ...acc,
      ...getStorageVariableBytesMapping(
        layout,
        variable,
        variable.slot * STORAGE_WORD_SIZE + variable.offset
      ),
    }),
    {}
  );

export const checkLayouts = (
  srcLayout: StorageLayoutReportExact,
  cmpLayout: StorageLayoutReportExact
): StorageLayoutDiff[] => {
  let diffs: StorageLayoutDiff[] = [];

  const srcMapping = getStorageBytesMapping(srcLayout);
  const cmpMapping = getStorageBytesMapping(cmpLayout);

  for (const byte of Object.keys(cmpMapping)) {
    const srcSlotVar = srcMapping[byte];
    const cmpSlotVar = cmpMapping[byte];

    if (!srcSlotVar) continue; // source byte was unused
    if (
      cmpSlotVar.type === srcSlotVar.type &&
      cmpSlotVar.fullLabel === srcSlotVar.fullLabel &&
      cmpSlotVar.slot === srcSlotVar.slot &&
      cmpSlotVar.offset === srcSlotVar.offset &&
      cmpSlotVar.startByte === srcSlotVar.startByte
    )
      continue; // variable did not change
    if (srcSlotVar.label === "__gap" || cmpSlotVar.label === "__gap") continue; // source byte was part of a gap slot or is replaced with a gap slot

    if (cmpSlotVar.fullLabel !== srcSlotVar.fullLabel) {
      // TODO: check this
      if (cmpSlotVar.fullLabel.startsWith(`(${srcSlotVar.typeLabel})${srcSlotVar.label}`)) continue; // variable is a member of source struct, in empty bytes

      if (cmpSlotVar.type === srcSlotVar.type) {
        if (cmpSlotVar.label !== srcSlotVar.label)
          diffs.push({
            location: {
              slot: srcSlotVar.slot,
              offset: srcSlotVar.offset,
            },
            type: StorageLayoutDiffType.LABEL,
            src: srcSlotVar,
            cmp: cmpSlotVar,
          });

        continue;
      }

      diffs.push({
        location: {
          slot: srcSlotVar.slot,
          offset: srcSlotVar.offset,
        },
        type: StorageLayoutDiffType.VARIABLE,
        src: srcSlotVar,
        cmp: cmpSlotVar,
      });

      continue;
    }

    if (cmpSlotVar.type !== srcSlotVar.type) {
      const cmpVarType = cmpLayout.types[cmpSlotVar.type];
      if ((cmpVarType.members?.length ?? 0) > 0) continue; // if the type has members, their corresponding bytes will be checked

      const srcVarType = srcLayout.types[srcSlotVar.type];
      if (cmpVarType.encoding === srcVarType.encoding) {
        if (cmpVarType.encoding === "mapping" && cmpVarType.key === srcVarType.key) {
          const srcValueType = srcLayout.types[srcVarType.value!];
          const cmpValueType = cmpLayout.types[cmpVarType.value!];

          if (
            // if the value isn't encoded "inplace", the canonic value bytes will be checked
            (cmpValueType.encoding === srcValueType.encoding &&
              cmpValueType.encoding !== "inplace") ||
            (cmpValueType.members?.length ?? 0) > 0 // if the value has members, their corresponding bytes will be checked
          )
            continue;
        } else if (cmpVarType.encoding === "dynamic_array") {
          const srcBaseType = srcLayout.types[srcVarType.base!];
          const cmpBaseType = cmpLayout.types[cmpVarType.base!];

          if (
            // if the value isn't encoded "inplace", the canonic value bytes will be checked
            (cmpBaseType.encoding === srcBaseType.encoding && cmpBaseType.encoding !== "inplace") ||
            (cmpBaseType.members?.length ?? 0) > 0 // if the value has members, their corresponding bytes will be checked
          )
            continue;
        }
      }

      diffs.push({
        location: {
          slot: srcSlotVar.slot,
          offset: srcSlotVar.offset,
        },
        type: StorageLayoutDiffType.VARIABLE_TYPE,
        src: srcSlotVar,
        cmp: cmpSlotVar,
      });
      continue;
    }
  }

  return _uniqWith(diffs, _isEqual);
};
