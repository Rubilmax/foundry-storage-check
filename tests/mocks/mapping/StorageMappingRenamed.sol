// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

contract Storage {
  struct Struct {
    bool a;
    uint256 b;
    uint32 c;
    uint32 d;
    address e;
  }

  bool _initialized;
  bool _initializing;
  mapping(address => mapping(address => mapping(uint256 => Struct))) nestedMapping;
  uint256[10] __gap;
  address _owner;
  mapping(address => Struct) _structOf;
}
