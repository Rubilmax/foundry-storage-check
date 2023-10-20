// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Example {
  struct Struct {
    bool a;
    uint256 b;
    uint64 c;
    uint64 d;
    address e;
  }

  bool _initialized;
  bool _initializing;

  uint256[10] __gap;

  address owner;

  mapping(address => Struct[]) structOf;
}
