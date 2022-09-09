import * as fs from "fs";

import { expect } from "@jest/globals";

import { checkLayouts } from "../src/check";
import { formatDiff } from "../src/format";
import { StorageLayoutReport } from "../src/types";

describe("Storage layout checks", () => {
  describe("Basic storage", () => {
    const srcContent = JSON.parse(
      fs.readFileSync("tests/mocks/storage_layout.ref.json", "utf8")
    ) as StorageLayoutReport;

    it("should not raise diff when comparing source to source", () => {
      const diff = checkLayouts(srcContent, srcContent);
      expect(diff).toEqual([]);
    });

    it("should raise label diff when renaming variable", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.renamed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Label diff at storage slot #0, byte #1: variable "_initializing" was renamed to "_initialization". Is it intentional?'
      );
    });

    it("should not raise slot diff because of variable added at start of gap slot", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.gap_start.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toBeUndefined();
    });

    it("should not raise slot diff because of variable added at end of gap slot", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.gap_end.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toBeUndefined();
    });

    it("should raise type diff when changing type of variable", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.type_changed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Variable type diff at storage slot #12, byte #0: variable "_owner" was of type "address" but is now "uint192".'
      );
    });

    it("should raise variable diff when removing variable", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.removed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Variable diff at storage slot #12, byte #0: variable "_owner" of type "address" was replaced by variable "fixedStructs" of type "struct Storage.Struct[3]".'
      );
    });

    it("should not raise variable diff when extending storage", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.extended.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toBeUndefined();
    });
  });

  describe("Struct storage", () => {
    const srcContent = JSON.parse(
      fs.readFileSync("tests/mocks/storage_layout.struct_ref.json", "utf8")
    ) as StorageLayoutReport;

    it("should raise type diff when changing name of struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_renamed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Variable type diff at storage slot #11, byte #0: variable "structs" was of type "struct Storage.Struct[]" but is now "struct Storage.Struct2[]".'
      );
    });

    it("should raise label diff when changing struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_changed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Label diff at storage slot #15, byte #0: variable "(struct Storage.Struct)myStruct.c" was renamed to "(struct Storage.Struct)myStruct.d". Is it intentional?'
      );
    });

    it("should raise variable diff when changing struct for smaller", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_smaller.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toBeUndefined();
    });

    it("should raise variable diff when changing struct variable type", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_type_changed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Variable diff at storage slot #14, byte #0: variable "(struct Storage.Struct)myStruct.b" of type "uint256" was replaced by variable "(struct Storage.Struct)myStruct.e" of type "address".'
      );
    });

    it("should not raise variable diff when extending struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.struct_extended.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toBeUndefined();
    });
  });

  describe("Mapping storage", () => {
    const srcContent = JSON.parse(
      fs.readFileSync("tests/mocks/storage_layout.mapping_ref.json", "utf8")
    ) as StorageLayoutReport;

    it("should raise label diff when changing name of mapping", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.mapping_renamed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Label diff at storage slot #13, byte #0: variable "structOf" was renamed to "_structOf". Is it intentional?'
      );
    });

    it("should raise type diff when changing mapping", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.mapping_changed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Variable type diff at storage slot #1, byte #0: variable "nestedMapping" was of type "mapping(address => mapping(address => mapping(uint256 => struct Storage.Struct)))" but is now "mapping(address => mapping(uint256 => mapping(uint256 => struct Storage.Struct)))".'
      );
    });

    it("should raise type diff when extending mapping", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.mapping_extended.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Variable type diff at storage slot #13, byte #0: variable "structOf" was of type "mapping(address => struct Storage.Struct)" but is now "mapping(address => mapping(address => struct Storage.Struct))".'
      );
    });

    it("should raise type diff when renaming mapping struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.mapping_struct_renamed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Variable type diff at storage slot #1, byte #0: variable "nestedMapping" was of type "mapping(address => mapping(address => mapping(uint256 => struct Storage.Struct)))" but is now "mapping(address => mapping(address => mapping(uint256 => struct Storage.Struct2)))".'
      );
    });

    it("should raise type diff when changing mapping struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.mapping_struct_changed.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toEqual(
        'Label diff at struct Storage.Struct slot #2, byte #0: variable "c" was renamed to "d". Is it intentional?'
      );
    });

    it("should not raise type diff when extended mapping struct", () => {
      const cmpContent = JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.mapping_struct_extended.json", "utf8")
      ) as StorageLayoutReport;

      const diff = formatDiff(checkLayouts(srcContent, cmpContent)[0]);
      expect(diff).toBeUndefined();
    });
  });

  it("morpho", () => {
    const diffs = checkLayouts(
      JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.morpho.json", "utf8")
      ) as StorageLayoutReport,
      JSON.parse(
        fs.readFileSync("tests/mocks/storage_layout.morpho_refactored.json", "utf8")
      ) as StorageLayoutReport
    ).map(formatDiff);

    expect(diffs).toEqual([
      'Label diff at struct Types.MarketStatus slot #0, byte #1: variable "isPaused" was renamed to "isSupplyPaused". Is it intentional?',
      'Label diff at struct Types.MarketStatus slot #0, byte #2: variable "isPartiallyPaused" was renamed to "isBorrowPaused". Is it intentional?',
    ]);
  });
});
