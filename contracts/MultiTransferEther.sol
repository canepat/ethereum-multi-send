pragma solidity ^0.5.15;

contract MultiTransferEther {
    constructor(address payable account, address payable[] memory recipients, uint256[] memory amounts) public payable {
        require(account != address(0), "MultiTransfer: account is the zero address");
        require(recipients.length > 0, "MultiTransfer: recipients length is zero");
        require(recipients.length == amounts.length, "MultiTransfer: size of recipients and amounts is not the same");

        for (uint256 i = 0; i < recipients.length; i++) {
            recipients[i].transfer(amounts[i]);
        }
        selfdestruct(account);
    }
}