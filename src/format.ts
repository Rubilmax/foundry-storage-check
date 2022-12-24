import {
  FormattedStorageLayoutDiff,
  ParsedSource,
  StorageLayoutDiff,
  StorageLayoutDiffType,
} from "./types";

export const diffLevels: { [type in StorageLayoutDiffType]?: "warning" | "error" } = {
  [StorageLayoutDiffType.LABEL]: "warning",
  [StorageLayoutDiffType.VARIABLE_TYPE]: "error",
  [StorageLayoutDiffType.TYPE_REMOVED]: "warning",
  [StorageLayoutDiffType.TYPE_CHANGED]: "error",
  [StorageLayoutDiffType.VARIABLE]: "error",
};

export const diffTitles: { [type in StorageLayoutDiffType]?: string } = {
  [StorageLayoutDiffType.LABEL]: "Label diff",
  [StorageLayoutDiffType.VARIABLE_TYPE]: "Variable type diff",
  [StorageLayoutDiffType.TYPE_REMOVED]: "Type removal",
  [StorageLayoutDiffType.TYPE_CHANGED]: "Type diff",
  [StorageLayoutDiffType.VARIABLE]: "Variable diff",
};

export const formatDiff = (
  cmpDef: ParsedSource,
  diff: StorageLayoutDiff
): FormattedStorageLayoutDiff => {
  const location =
    (diff.parent
      ? `${diff.parent} slot #${diff.location.slot.toString(10)}`
      : `storage slot 0x${diff.location.slot.toString(16).padStart(64, "0")}`) +
    `, byte #${diff.location.offset.toString()}`;

  const loc = cmpDef.tokens.find(
    (token) => token.type === "Identifier" && "cmp" in diff && token.value === diff.cmp.label
  )?.loc ?? {
    start: {
      line: 0,
      column: 0,
    },
    end: {
      line: 0,
      column: 0,
    },
  };

  const { type } = diff;
  switch (type) {
    case StorageLayoutDiffType.LABEL:
      return {
        loc,
        type,
        message: `variable "${diff.src.fullLabel}" was renamed to "${diff.cmp.fullLabel}". Is it intentional? (${location})`,
      };
    case StorageLayoutDiffType.VARIABLE_TYPE:
      return {
        loc,
        type,
        message: `variable "${diff.src.fullLabel}" was of type "${diff.src.typeLabel}" but is now "${diff.cmp.typeLabel}" (${location})`,
      };
    case StorageLayoutDiffType.VARIABLE_REMOVED:
      return {
        loc,
        type,
        message: `variable "${diff.src.fullLabel}" of type "${diff.src.typeLabel}" was removed (${location})`,
      };
    case StorageLayoutDiffType.TYPE_REMOVED:
      return {
        loc,
        type,
        message: `type "${diff.src.fullLabel}" was removed.`,
      };
    case StorageLayoutDiffType.TYPE_CHANGED:
      return {
        loc,
        type,
        message: `type "${diff.src.fullLabel}" was changed.`,
      };
    case StorageLayoutDiffType.VARIABLE:
      return {
        loc,
        type,
        message: `variable "${diff.src.fullLabel}" of type "${diff.src.typeLabel}" was replaced by variable "${diff.cmp.fullLabel}" of type "${diff.cmp.typeLabel}" (${location})`,
      };
    case StorageLayoutDiffType.NON_ZERO_ADDED_SLOT:
      return {
        loc,
        type,
        message: `variable "${diff.cmp.fullLabel}" of type "${diff.cmp.typeLabel}" was added at a non-zero storage byte (${location}: 0x${diff.value})`,
      };
    default:
      return {
        loc,
        type,
        message: `Storage layout diff`,
      };
  }
};
