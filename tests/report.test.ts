import * as fs from "fs";

import { expect } from "@jest/globals";

import { checkLayouts } from "../src/check";
import { StorageLayoutReport } from "../src/types";

const srcContent = JSON.parse(
  fs.readFileSync("tests/mocks/storage_layout.ref.json", "utf8")
) as StorageLayoutReport;
const srcContent2 = JSON.parse(
  fs.readFileSync("tests/mocks/storage_layout.struct_ref.json", "utf8")
) as StorageLayoutReport;

describe("Storage layout checks", () => {
  describe("Basic storage", () => {
    it("should not raise diff when comparing source to source", () => {
      const diff = checkLayouts(srcContent, srcContent);
      expect(diff).toBeUndefined();
    });

    it("should raise label diff when renaming variable", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.renamed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent, cmpContent);
      expect(diff).toEqual(
        'Label diff at storage slot #0, bytes #1: variable "_initializing" was renamed to "_initialization". Is it intentional?'
      );
    });

    it("should not raise slot diff because of variable added at start of gap slot", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.gap_start.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent, cmpContent);
      expect(diff).toBeUndefined();
    });

    it("should not raise slot diff because of variable added at end of gap slot", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.gap_end.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent, cmpContent);
      expect(diff).toBeUndefined();
    });

    it("should raise type diff when changing type of variable", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.type_changed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent, cmpContent);
      expect(diff).toEqual(
        'Type diff at storage slot #12, bytes #0: variable "_owner" was of type "address" but is now "uint192".'
      );
    });

    it("should raise variable diff when removing variable", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.removed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent, cmpContent);
      expect(diff).toEqual(
        'Variable diff at storage slot #12, bytes #0: variable "_owner" of type "address" was replaced by variable "fixedStructs" of type "Struct[3]".'
      );
    });

    it("should not raise variable diff when extending storage", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.extended.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent, cmpContent);
      expect(diff).toBeUndefined();
    });
  });

  describe("Nested storage", () => {
    it("should raise type diff when changing name of struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_renamed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent2, cmpContent);
      expect(diff).toEqual(
        'Type diff at storage slot #11, bytes #0: variable "structs" was of type "Struct[]" but is now "Struct2[]".'
      );
    });

    it("should raise label diff when changing struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_changed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent2, cmpContent);
      expect(diff).toEqual(
        'Label diff at storage slot #15, bytes #0: variable "(Struct)myStruct.c" was renamed to "(Struct)myStruct.d". Is it intentional?'
      );
    });

    it("should raise variable diff when changing struct for smaller", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_smaller.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent2, cmpContent);
      expect(diff).toBeUndefined();
    });

    it("should raise variable diff when changing struct variable type", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_type_changed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent2, cmpContent);
      expect(diff).toEqual(
        'Variable diff at storage slot #14, bytes #0: variable "(Struct)myStruct.b" of type "uint256" was replaced by variable "(Struct)myStruct.e" of type "address".'
      );
    });

    it("should not raise variable diff when extending struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_extended.json", "utf8")
      ) as StorageLayoutReport;

      const diff = checkLayouts(srcContent2, cmpContent);
      expect(diff).toBeUndefined();
    });
  });
});
