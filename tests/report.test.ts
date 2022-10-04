import { expect } from "@jest/globals";

import { checkLayouts } from "../src/check";
import { formatDiff } from "../src/format";
import { createLayout, parseLayout, parseSource } from "../src/input";

describe("Storage layout checks", () => {
  describe("Basic storage", () => {
    const srcLayout = parseLayout(createLayout("tests/mocks/basic/StorageRef.sol:Storage"));

    it("should not raise diff when comparing source to source", () => {
      const diffs = checkLayouts(srcLayout, srcLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should raise label diff when renaming variable", () => {
      const contract = "tests/mocks/StorageRenamed.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "_initializing" was renamed to "_initialization". Is it intentional? (storage slot 0x0000000000000000000000000000000000000000000000000000000000000000, byte #1)'
      );
    });

    it("should not raise diff when variable added at start of gap slot", () => {
      const contract = "tests/mocks/basic/StorageGapStart.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should not raise diff when variable added at end of gap slot", () => {
      const contract = "tests/mocks/basic/StorageGapEnd.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should raise type diff when changing type of variable", () => {
      const contract = "tests/mocks/basic/StorageChanged.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "_owner" was of type "address" but is now "uint192" (storage slot 0x000000000000000000000000000000000000000000000000000000000000000c, byte #0)'
      );
    });

    it("should not raise diff when removing variable", () => {
      const contract = "tests/mocks/basic/StorageRemoved.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should not raise diff when extending storage", () => {
      const contract = "tests/mocks/basic/StorageExtended.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });
  });

  describe("Struct storage", () => {
    const srcLayout = parseLayout(createLayout("tests/mocks/struct/StorageStructRef.sol:Storage"));

    it("should not raise diff when changing name of struct", () => {
      const contract = "tests/mocks/struct/StorageStructRenamed.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should raise label diff when switching struct variables", () => {
      const contract = "tests/mocks/struct/StorageStructChanged.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(4);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "(Storage.Struct)myStruct.c" was renamed to "(Storage.Struct)myStruct.d". Is it intentional? (storage slot 0x000000000000000000000000000000000000000000000000000000000000000f, byte #0)'
      );
      expect(formatDiff(cmpDef, diffs[1]).message).toEqual(
        'variable "(Storage.Struct)myStruct.d" was renamed to "(Storage.Struct)myStruct.c". Is it intentional? (storage slot 0x000000000000000000000000000000000000000000000000000000000000000f, byte #4)'
      );
      expect(formatDiff(cmpDef, diffs[2]).message).toEqual(
        'variable "(Storage.Struct)structs.c" was renamed to "(Storage.Struct)structs.d". Is it intentional? (storage slot 0x60811857dd566889ff6255277d82526f2d9b3bbcb96076be22a5860765ac3d08, byte #0)'
      );
      expect(formatDiff(cmpDef, diffs[3]).message).toEqual(
        'variable "(Storage.Struct)structs.d" was renamed to "(Storage.Struct)structs.c". Is it intentional? (storage slot 0x60811857dd566889ff6255277d82526f2d9b3bbcb96076be22a5860765ac3d08, byte #4)'
      );
    });

    it("should not raise diff when changing struct for smaller, free storage word", () => {
      const contract = "tests/mocks/struct/StorageStructSmaller.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should raise variable diff when using larger struct", () => {
      const contract = "tests/mocks/struct/StorageStructLarger.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(2);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "(Storage.Struct)myStruct.b" of type "uint256" was replaced by variable "(Storage.Struct)myStruct.e" of type "address" (storage slot 0x000000000000000000000000000000000000000000000000000000000000000e, byte #0)'
      );
      expect(formatDiff(cmpDef, diffs[1]).message).toEqual(
        'variable "(Storage.Struct)structs.b" of type "uint256" was replaced by variable "(Storage.Struct)structs.e" of type "address" (storage slot 0x60811857dd566889ff6255277d82526f2d9b3bbcb96076be22a5860765ac3d07, byte #0)'
      );
    });

    it("should not raise variable diff when extending struct", () => {
      const contract = "tests/mocks/struct/StorageStructExtended.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });
  });

  describe("Mapping storage", () => {
    const srcLayout = parseLayout(createLayout("tests/mocks/StorageMappingRef.sol:Storage"));

    it("should raise label diff when changing name of mapping", () => {
      const contract = "tests/mocks/mapping/StorageMappingRenamed.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "structOf" was renamed to "_structOf". Is it intentional? (storage slot 0x000000000000000000000000000000000000000000000000000000000000000d, byte #0)'
      );
    });

    it("should raise type diff when changing mapping", () => {
      const contract = "tests/mocks/mapping/StorageMappingChanged.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(1);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "nestedMapping[0]" was of type "mapping(address => mapping(uint256 => Storage.Struct))" but is now "mapping(uint256 => mapping(uint256 => Storage.Struct))" (storage slot 0xc13ad76448cbefd1ee83b801bcd8f33061f2577d6118395e7b44ea21c7ef62e0, byte #0)'
      );
    });

    it("should raise type diff when extending mapping", () => {
      const contract = "tests/mocks/mapping/StorageMappingExtended.sol:Storage";
      const cmpDef = parseSource(contract);
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(2);
      expect(formatDiff(cmpDef, diffs[0]).message).toEqual(
        'variable "structOf" was of type "mapping(address => Storage.Struct)" but is now "mapping(address => mapping(address => Storage.Struct))" (storage slot 0x000000000000000000000000000000000000000000000000000000000000000d, byte #0)'
      );
      expect(formatDiff(cmpDef, diffs[1]).message).toEqual(
        'variable "(Storage.Struct)structOf[0].a" of type "bool" was replaced by variable "structOf[0]" of type "mapping(address => Storage.Struct)" (storage slot 0x91d3ecd2a4b33a91a2a6360f87f530a38fc3d60e51ba8524f83e3f14addbb728, byte #0)'
      );
    });

    it("should not raise diff when renaming mapping struct", () => {
      const contract = "tests/mocks/mapping/StorageMappingStructRenamed.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });

    it("should not raise diff when extended mapping struct", () => {
      const contract = "tests/mocks/mapping/StorageMappingStructExtended.sol:Storage";
      const cmpLayout = parseLayout(createLayout(contract));

      const diffs = checkLayouts(srcLayout, cmpLayout);
      expect(diffs).toHaveLength(0);
    });
  });
});
