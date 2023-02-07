// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// not the ones from "./Types.sol"
library Types {
  enum TokenType {
    ERC20,
    ERC721,
    ERC1155
  }

  struct Struct {
    bool a;
    uint256 b;
    uint16 c;
    uint16 d;
    address e;
  }
}

contract Storage {
  bool _initialized;
  bool _initializing;
  uint256[10] __gap;
  Types.Struct[] structs;
  address _owner;
  Types.TokenType token;
  Types.Struct[3] fixedStructs;
  Types.Struct myStruct;
  uint8 added;
}
