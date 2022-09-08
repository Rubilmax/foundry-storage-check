import fs from "fs";
import _range from "lodash/range";

import { StorageLayoutReport, StorageVariable } from "./types";

interface StorageVariableDetails extends StorageVariable {
  startByte: number;
  bytesLength: number;
}

interface StorageBytesMapping {
  [byte: string]: StorageVariableDetails;
}

const getVariableTypeBytesLength = (layout: StorageLayoutReport, variableType: string): number => {
  const varType = layout.types[variableType];

  if (!varType) {
    if (variableType.includes("t_array")) {
      const [, arrayType, arrayLength] = variableType.match(/t_array\((.*)\)(\d+)/) || [];
      return getVariableTypeBytesLength(layout, arrayType) * Number(arrayLength) * 32;
    }

    return 1;
  }

  return (
    varType.members?.reduce(
      (total, member) => total + getVariableTypeBytesLength(layout, member.type),
      0
    ) ?? Number(varType.numberOfBytes)
  );
};

const getVariableTypeName = (layout: StorageLayoutReport, variableType: string): string => {
  if (variableType.startsWith("t_array")) {
    const [, arrayType, arrayLength] = variableType.match(/^t_array\((.*)\)(\d+)?/) || [];

    return `${getVariableTypeName(layout, arrayType)}[${arrayLength ?? ""}]`;
  }

  if (variableType.startsWith("t_struct")) {
    const [, arrayType] = variableType.match(/^t_struct\((.*)\)(\d+|dyn)_storage/) || [];

    return getVariableTypeName(layout, arrayType);
  }

  return variableType.replace(/^t_/, "");
};

const getStorageVariableBytesMapping = (
  layout: StorageLayoutReport,
  variable: StorageVariable,
  startByte: number
): StorageBytesMapping => {
  const variableDetails: StorageVariableDetails = {
    ...variable,
    type: getVariableTypeName(layout, variable.type),
    startByte,
    bytesLength: getVariableTypeBytesLength(layout, variable.type),
  };

  const varType = layout.types[variable.type];
  return (varType?.members ?? []).reduce(
    (acc, member) => ({
      ...acc,
      ...getStorageVariableBytesMapping(
        layout,
        {
          ...member,
          label: `(${variableDetails.type})${variableDetails.label}.${member.label}`,
          slot: (Number(variableDetails.slot) + Number(member.slot)).toString(),
        },
        startByte + Number(member.slot) * 32 + member.offset
      ),
    }),
    Object.fromEntries(
      _range(variableDetails.bytesLength).map((byteIndex) => [
        startByte + byteIndex,
        variableDetails,
      ])
    )
  );
};

const getStorageBytesMapping = (layout: StorageLayoutReport): StorageBytesMapping =>
  layout.storage.reduce((acc, variable) => {
    const startByte = Number(variable.slot) * 32 + variable.offset;

    return {
      ...acc,
      ...getStorageVariableBytesMapping(layout, variable, startByte),
    };
  }, {});

export const checkLayouts = (
  sourceLayout: StorageLayoutReport,
  compareLayout: StorageLayoutReport
): string | undefined => {
  const srcMapping = getStorageBytesMapping(sourceLayout);
  const cmpMapping = getStorageBytesMapping(compareLayout);

  fs.writeFileSync("test.json", JSON.stringify(srcMapping, null, 2));
  fs.writeFileSync("test2.json", JSON.stringify(cmpMapping, null, 2));

  for (const slot of Object.keys(cmpMapping)) {
    const srcSlotVar = srcMapping[slot];
    const cmpSlotVar = cmpMapping[slot];

    if (!srcSlotVar) continue; // source slot was unused
    if (srcSlotVar.label === "__gap" && srcSlotVar.type.includes("uint256[")) continue; // source slot was a gap slot
    if (
      cmpSlotVar.label === srcSlotVar.label &&
      cmpSlotVar.offset === srcSlotVar.offset &&
      cmpSlotVar.slot === srcSlotVar.slot &&
      cmpSlotVar.type === srcSlotVar.type &&
      cmpSlotVar.startByte === srcSlotVar.startByte &&
      cmpSlotVar.bytesLength === srcSlotVar.bytesLength
    )
      continue; // variable did not change

    if (cmpSlotVar.label !== srcSlotVar.label) {
      // TODO: hard test this
      if (cmpSlotVar.label.includes(`(${srcSlotVar.type})${srcSlotVar.label}`)) continue; // variable is a member of source struct, in empty slot

      if (cmpSlotVar.type === srcSlotVar.type)
        return `Label diff at storage slot #${srcSlotVar.slot}, bytes #${srcSlotVar.offset}: variable "${srcSlotVar.label}" was renamed to "${cmpSlotVar.label}". Is it intentional?`;

      return `Variable diff at storage slot #${srcSlotVar.slot}, bytes #${srcSlotVar.offset}: variable "${srcSlotVar.label}" of type "${srcSlotVar.type}" was replaced by variable "${cmpSlotVar.label}" of type "${cmpSlotVar.type}".`;
    }

    if (cmpSlotVar.type !== srcSlotVar.type) {
      return `Type diff at storage slot #${srcSlotVar.slot}, bytes #${srcSlotVar.offset}: variable "${srcSlotVar.label}" was of type "${srcSlotVar.type}" but is now "${cmpSlotVar.type}".`;
    }
  }
};
