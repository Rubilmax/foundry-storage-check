import _range from "lodash/range";

import {
  StorageLayoutDiff,
  StorageLayoutDiffType,
  StorageLayoutReport,
  StorageVariable,
} from "./types";

interface StorageVariableDetails extends StorageVariable {
  startByte: number;
}

interface StorageBytesMapping {
  [byte: string]: StorageVariableDetails;
}

const getVariableTypeName = (layout: StorageLayoutReport, variableType: string): string => {
  const type = layout.types[variableType];
  if (type) return type.label;

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
    // don't populate if type has members because all reserved bytes may not be actually used: used bytes will get populated via reducing (see above)
    varType.members
      ? {}
      : Object.fromEntries(
          _range(Number(varType.numberOfBytes)).map((byteIndex) => [
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
  srcLayout: StorageLayoutReport,
  cmpLayout: StorageLayoutReport,
  checktypes = true
): StorageLayoutDiff[] => {
  let diffs: StorageLayoutDiff[] = [];

  const srcMapping = getStorageBytesMapping(srcLayout);
  const cmpMapping = getStorageBytesMapping(cmpLayout);

  for (const slot of Object.keys(cmpMapping)) {
    const srcSlotVar = srcMapping[slot];
    const cmpSlotVar = cmpMapping[slot];

    if (!srcSlotVar) continue; // source slot was unused
    if (
      cmpSlotVar.label === srcSlotVar.label &&
      cmpSlotVar.offset === srcSlotVar.offset &&
      cmpSlotVar.slot === srcSlotVar.slot &&
      cmpSlotVar.type === srcSlotVar.type &&
      cmpSlotVar.startByte === srcSlotVar.startByte
    )
      continue; // variable did not change
    if (srcSlotVar.label === "__gap" || cmpSlotVar.label === "__gap") continue; // source slot was a gap slot or is replaced with a gap slot

    if (cmpSlotVar.label !== srcSlotVar.label) {
      if (cmpSlotVar.label.startsWith(`(${srcSlotVar.type})${srcSlotVar.label}`)) continue; // variable is a member of source struct, in empty slot

      if (cmpSlotVar.type === srcSlotVar.type) {
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

  if (!checktypes) return diffs;

  // At this point, storage layout is sound but mappings storage may not:
  // Let's check for type changes to make sure mappings with arrays or structs are not messed up
  const srcTypesWithMembers = Object.fromEntries(
    Object.keys(srcLayout.types)
      .filter((type) => srcLayout.types[type].members)
      .map((type) => [srcLayout.types[type].label, srcLayout.types[type]])
  );
  const cmpTypesWithMembers = Object.fromEntries(
    Object.keys(cmpLayout.types)
      .filter((type) => cmpLayout.types[type].members)
      .map((type) => [cmpLayout.types[type].label, cmpLayout.types[type]])
  );
  for (const srcTypeLabel of Object.keys(srcTypesWithMembers)) {
    const srcType = srcTypesWithMembers[srcTypeLabel];
    const cmpType = cmpTypesWithMembers[srcTypeLabel];

    if (!cmpType) {
      diffs.push({
        location: srcType.label,
        type: StorageLayoutDiffType.TYPE_REMOVED,
        src: { label: srcType.label, type: srcType.label },
        cmp: { label: srcType.label, type: srcType.label },
      });
      continue;
    }

    if (!cmpType.members) {
      diffs.push({
        location: srcType.label,
        type: StorageLayoutDiffType.TYPE_CHANGED,
        src: { label: srcType.label, type: srcType.label },
        cmp: { label: srcType.label, type: srcType.label },
      });
      continue;
    }

    diffs = diffs.concat(
      checkLayouts(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        { storage: srcType.members!, types: srcLayout.types },
        { storage: cmpType.members, types: cmpLayout.types },
        false
      ).map((diff) => ({ ...diff, parent: srcType.label }))
    );
  }

  return diffs;
};
