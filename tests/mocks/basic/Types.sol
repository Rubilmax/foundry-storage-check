//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

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
