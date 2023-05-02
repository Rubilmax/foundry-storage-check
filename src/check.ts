import _isEqual from "lodash/isEqual";
import _range from "lodash/range";
import _sortBy from "lodash/sortBy";
import _uniqWith from "lodash/uniqWith";

import { Provider } from "@ethersproject/providers";
import { keccak256 } from "@ethersproject/solidity";

import {
  StorageLayoutDiffAdded,
  StorageLayoutDiff,
  StorageLayoutDiffType,
  StorageLayoutReportExact,
  StorageVariableDetails,
  StorageVariableExact,
  StorageLayoutDiffAddedNonZeroSlot,
} from "./types";

export const STORAGE_WORD_SIZE = 32n;
export const FOUNDRY_TYPE_ID_REGEX = /(?<=t_[a-z0-9_]+\([A-Z]\w*\))(\d+)/g;

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
      slot = BigInt(keccak256(["uint256"], [variable.slot])); // slot of the element at index 0
      example = getStorageVariableBytesMapping(
        layout,
        {
          ...variable,
          slot,
          offset: 0n,
          type: varType.base!,
          label: variable.label.replace("[]", "[0]"),
        },
        slot * STORAGE_WORD_SIZE
      );
      break;
    case "mapping":
      slot = BigInt(keccak256(["uint256", "uint256"], [0, variable.slot])); // slot of the element at key 0
      example = getStorageVariableBytesMapping(
        layout,
        {
          ...variable,
          slot,
          offset: 0n,
          type: varType.value!,
          label: `${variable.label}[0]`,
        },
        slot * STORAGE_WORD_SIZE
      );
      break;
    default:
      break;
  }

  const details: StorageVariableDetails = {
    ...variable,
    fullLabel: variable.parent
      ? `(${variable.parent.typeLabel} ${variable.parent.label}).${variable.label}`
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

const sortDiffs = <T extends StorageLayoutDiff | StorageLayoutDiffAdded>(diffs: T[]) =>
  _sortBy(diffs, [({ location }) => location.slot, ({ location }) => location.offset]);

export const checkLayouts = async (
  srcLayout: StorageLayoutReportExact,
  cmpLayout: StorageLayoutReportExact,
  {
    address,
    provider,
    checkRemovals,
  }: { address?: string; provider?: Provider; checkRemovals?: boolean } = {}
): Promise<StorageLayoutDiff[]> => {
  const diffs: StorageLayoutDiff[] = [];
  const added: StorageLayoutDiffAdded[] = [];

  const srcMapping = getStorageBytesMapping(srcLayout);
  const cmpMapping = getStorageBytesMapping(cmpLayout);

  for (const byte of Object.keys(cmpMapping)) {
    const srcSlotVar = srcMapping[byte];
    const cmpSlotVar = cmpMapping[byte];

    const byteIndex = BigInt(byte);
    const location = {
      slot: byteIndex / STORAGE_WORD_SIZE,
      offset: byteIndex % STORAGE_WORD_SIZE,
    };

    if (!srcSlotVar) {
      added.push({
        location,
        cmp: cmpSlotVar,
      });

      continue; // source byte was unused
    }

    if (
      cmpSlotVar.type === srcSlotVar.type &&
      cmpSlotVar.fullLabel === srcSlotVar.fullLabel &&
      cmpSlotVar.slot === srcSlotVar.slot &&
      cmpSlotVar.offset === srcSlotVar.offset &&
      cmpSlotVar.startByte === srcSlotVar.startByte
    )
      continue; // variable did not change

    if (srcSlotVar.label === "__gap" || cmpSlotVar.label === "__gap") {
      added.push({
        location,
        cmp: cmpSlotVar,
      });

      continue; // source byte was part of a gap slot or is replaced with a gap slot
    }

    if (cmpSlotVar.fullLabel !== srcSlotVar.fullLabel) {
      if (cmpSlotVar.fullLabel.startsWith(`(${srcSlotVar.typeLabel} ${srcSlotVar.label})`)) {
        added.push({
          location,
          cmp: cmpSlotVar,
        });

        continue; // variable is a member of source struct, in empty bytes
      }

      if (cmpSlotVar.type === srcSlotVar.type) {
        if (cmpSlotVar.label !== srcSlotVar.label)
          diffs.push({
            location,
            type: StorageLayoutDiffType.LABEL,
            src: srcSlotVar,
            cmp: cmpSlotVar,
          });

        continue;
      }

      diffs.push({
        location,
        type: StorageLayoutDiffType.VARIABLE,
        src: srcSlotVar,
        cmp: cmpSlotVar,
      });

      continue;
    }

    if (
      cmpSlotVar.type.replace(FOUNDRY_TYPE_ID_REGEX, "") !==
      srcSlotVar.type.replace(FOUNDRY_TYPE_ID_REGEX, "")
    ) {
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
        } else if (
          (srcSlotVar.type.startsWith("t_contract") || srcSlotVar.type === "t_address") &&
          (cmpSlotVar.type.startsWith("t_contract") || cmpSlotVar.type === "t_address")
        ) {
          continue; // source & target bytes are part of an address disguised as an interface
        }
      }

      diffs.push({
        location,
        type: StorageLayoutDiffType.VARIABLE_TYPE,
        src: srcSlotVar,
        cmp: cmpSlotVar,
      });

      continue;
    }
  }

  if (checkRemovals) {
    for (const byte of Object.keys(srcMapping)) {
      const srcSlotVar = srcMapping[byte];
      const cmpSlotVar = cmpMapping[byte];

      const byteIndex = BigInt(byte);
      const location = {
        slot: byteIndex / STORAGE_WORD_SIZE,
        offset: byteIndex % STORAGE_WORD_SIZE,
      };

      if (!cmpSlotVar)
        diffs.push({
          location,
          type: StorageLayoutDiffType.VARIABLE_REMOVED,
          src: srcSlotVar,
        });
    }
  }

  return _uniqWith(
    sortDiffs(diffs), // make sure it's ordered by storage byte order
    ({ location: location1, ...diff1 }, { location: location2, ...diff2 }) => _isEqual(diff1, diff2) // only keep first byte diff of a variable, which corresponds to the start byte
  ).concat(await checkAddedStorageSlots(added, address, provider));
};

const checkAddedStorageSlots = async (
  added: StorageLayoutDiffAdded[],
  address?: string,
  provider?: Provider
): Promise<StorageLayoutDiffAddedNonZeroSlot[]> => {
  const diffs: StorageLayoutDiffAddedNonZeroSlot[] = [];
  if (!address || !provider) return [];

  const storage: { [slot: string]: string } = {};
  for (const diff of sortDiffs(added)) {
    const slot = "0x" + diff.location.slot.toString(16);

    const memoized = storage[slot];
    let value = memoized ?? (await provider.getStorageAt(address, slot));
    if (!memoized) storage[slot] = value;

    const byteIndex = value.length - Number((diff.location.offset + 1n) * 2n);
    value = value.substring(byteIndex, byteIndex + 2);

    if (value === "00") continue;

    diffs.push({
      ...diff,
      type: StorageLayoutDiffType.NON_ZERO_ADDED_SLOT,
      value,
    });
  }

  return _uniqWith(
    diffs,
    (
      { location: location1, value: value1, ...diff1 },
      { location: location2, value: value2, ...diff2 }
    ) => _isEqual(diff1, diff2) // only keep first byte diff of a variable, which corresponds to the start byte
  );
};
