// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

contract Storage {
  struct Struct2 {
    bool a;
    uint256 b;
    uint16 c;
    uint16 d;
    address e;
  }

  bool _initialized;
  bool _initializing;
  uint256[10] __gap;
  Struct2[] structs;
  address _owner;
  Struct2[3] fixedStructs;
  Struct2 myStruct;
}
