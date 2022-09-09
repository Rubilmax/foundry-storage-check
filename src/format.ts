import { StorageLayoutDiff, StorageLayoutDiffType } from "./types";

export const formatDiff = (diff: StorageLayoutDiff) => {
  const location =
    (diff.parent || "storage") +
    " " +
    (typeof diff.location === "string"
      ? diff.location
      : `slot #${diff.location.slot}, byte #${diff.location.offset}`);

  switch (diff.type) {
    case StorageLayoutDiffType.LABEL:
      return `Label diff at ${location}: variable "${diff.src.label}" was renamed to "${diff.cmp.label}". Is it intentional?`;
    case StorageLayoutDiffType.VARIABLE_TYPE:
      return `Variable type diff at ${location}: variable "${diff.src.label}" was of type "${diff.src.type}" but is now "${diff.cmp.type}".`;
    case StorageLayoutDiffType.TYPE_REMOVED:
      return `Type diff: type "${diff.src.label}" was removed.`;
    case StorageLayoutDiffType.TYPE_CHANGED:
      return `Type diff: type "${diff.src.label}" was changed.`;
    case StorageLayoutDiffType.VARIABLE:
      return `Variable diff at ${location}: variable "${diff.src.label}" of type "${diff.src.type}" was replaced by variable "${diff.cmp.label}" of type "${diff.cmp.type}".`;
    default:
      return `Storage layout diff at ${location}: variable "${diff.src.label}" of type "${diff.src.type}" was replaced by variable "${diff.cmp.label}" of type "${diff.cmp.type}".`;
  }
};
