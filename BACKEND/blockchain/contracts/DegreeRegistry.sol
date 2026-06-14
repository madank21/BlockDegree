// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/refs/tags/v5.0.0/contracts/token/ERC721/ERC721.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/refs/tags/v5.0.0/contracts/access/Ownable.sol";

/**
 * @title DegreeRegistry
 * @dev Blockchain-based degree certificate registry using ERC721 NFTs
 */
contract DegreeRegistry is ERC721, Ownable {
    // OpenZeppelin v5 removed Counters.sol. We use a standard uint256 counter instead.
    uint256 private _tokenIds;

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Degree {
        bytes32 degreeHash;
        address graduateAddress;
        string studentName;
        string degreeTitle;
        string institutionName;
        uint256 graduationDate;
        string certificateNumber;
        uint256 issueTimestamp;
        bool isRevoked;
        string revocationReason;
        uint256 revocationTimestamp;
    }

    // ─── State Variables ──────────────────────────────────────────────────────

    mapping(uint256 => Degree) private _degrees;
    mapping(bytes32 => uint256) private _hashToTokenId;
    mapping(address => bool) private _authorizedIssuers;

    // ─── Events ───────────────────────────────────────────────────────────────

    event DegreeIssued(
        uint256 indexed tokenId,
        address indexed graduateAddress,
        bytes32 degreeHash,
        string certificateNumber,
        uint256 timestamp
    );

    event DegreeRevoked(
        uint256 indexed tokenId,
        bytes32 degreeHash,
        string reason,
        uint256 timestamp
    );

    event IssuerAuthorized(address indexed issuer, bool authorized);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAuthorized() {
        require(
            owner() == msg.sender || _authorizedIssuers[msg.sender],
            "DegreeRegistry: Not authorized"
        );
        _;
    }

    modifier degreeExists(bytes32 degreeHash) {
        require(_hashToTokenId[degreeHash] != 0, "DegreeRegistry: Degree not found");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() ERC721("BlockDegree Certificate", "BDC") Ownable(msg.sender) {
        _authorizedIssuers[msg.sender] = true;
    }

    // ─── Issuer Management ────────────────────────────────────────────────────

    function setIssuerAuthorization(address issuer, bool authorized) external onlyOwner {
        _authorizedIssuers[issuer] = authorized;
        emit IssuerAuthorized(issuer, authorized);
    }

    function isAuthorizedIssuer(address issuer) external view returns (bool) {
        return _authorizedIssuers[issuer];
    }

    // ─── Issue Degree ─────────────────────────────────────────────────────────

    function issueDegree(
        bytes32 degreeHash,
        address graduateAddress,
        string memory studentName,
        string memory degreeTitle,
        string memory institutionName,
        uint256 graduationDate,
        string memory certificateNumber
    ) external onlyAuthorized returns (uint256) {
        require(degreeHash != bytes32(0), "DegreeRegistry: Invalid hash");
        require(_hashToTokenId[degreeHash] == 0, "DegreeRegistry: Degree already exists");
        require(bytes(studentName).length > 0, "DegreeRegistry: Student name required");
        require(bytes(degreeTitle).length > 0, "DegreeRegistry: Degree title required");
        require(bytes(certificateNumber).length > 0, "DegreeRegistry: Certificate number required");

        // Native increment replaces _tokenIds.increment()
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        require(graduateAddress != address(0), "DegreeRegistry: Graduate address required");
        _mint(graduateAddress, newTokenId);

        _degrees[newTokenId] = Degree({
            degreeHash: degreeHash,
            graduateAddress: graduateAddress,
            studentName: studentName,
            degreeTitle: degreeTitle,
            institutionName: institutionName,
            graduationDate: graduationDate,
            certificateNumber: certificateNumber,
            issueTimestamp: block.timestamp,
            isRevoked: false,
            revocationReason: "",
            revocationTimestamp: 0
        });

        _hashToTokenId[degreeHash] = newTokenId;

        emit DegreeIssued(newTokenId, graduateAddress, degreeHash, certificateNumber, block.timestamp);

        return newTokenId;
    }

    // ─── Revoke Degree ────────────────────────────────────────────────────────

    function revokeDegree(
        bytes32 degreeHash,
        string memory reason
    ) external onlyAuthorized degreeExists(degreeHash) {
        uint256 tokenId = _hashToTokenId[degreeHash];
        require(!_degrees[tokenId].isRevoked, "DegreeRegistry: Already revoked");
        require(bytes(reason).length > 0, "DegreeRegistry: Reason required");

        _degrees[tokenId].isRevoked = true;
        _degrees[tokenId].revocationReason = reason;
        _degrees[tokenId].revocationTimestamp = block.timestamp;

        emit DegreeRevoked(tokenId, degreeHash, reason, block.timestamp);
    }

    // ─── Verify Degree ────────────────────────────────────────────────────────

    function verifyDegree(bytes32 degreeHash)
        external
        view
        returns (
            bool isValid,
            bool isRevoked,
            string memory studentName,
            string memory degreeTitle,
            string memory institutionName,
            uint256 graduationDate,
            string memory certificateNumber,
            uint256 issueTimestamp
        )
    {
        uint256 tokenId = _hashToTokenId[degreeHash];

        if (tokenId == 0) {
            return (false, false, "", "", "", 0, "", 0);
        }

        Degree memory degree = _degrees[tokenId];

        return (
            !degree.isRevoked,
            degree.isRevoked,
            degree.studentName,
            degree.degreeTitle,
            degree.institutionName,
            degree.graduationDate,
            degree.certificateNumber,
            degree.issueTimestamp
        );
    }

    // ─── Get Degree by Token ID ───────────────────────────────────────────────

    function getDegreeByTokenId(uint256 tokenId)
        external
        view
        returns (
            bytes32 degreeHash,
            string memory studentName,
            string memory degreeTitle,
            string memory institutionName,
            uint256 graduationDate,
            string memory certificateNumber,
            bool isRevoked
        )
    {
        // Internal _ownerOf used to check token existence in OpenZeppelin v5
        require(_ownerOf(tokenId) != address(0), "DegreeRegistry: Token does not exist");
        Degree memory degree = _degrees[tokenId];

        return (
            degree.degreeHash,
            degree.studentName,
            degree.degreeTitle,
            degree.institutionName,
            degree.graduationDate,
            degree.certificateNumber,
            degree.isRevoked
        );
    }

    // ─── Get Token ID by Hash ─────────────────────────────────────────────────

    function getTokenIdByHash(bytes32 degreeHash) external view returns (uint256) {
        return _hashToTokenId[degreeHash];
    }

    // ─── Total Supply ─────────────────────────────────────────────────────────

    function totalSupply() external view returns (uint256) {
        // Native variable return replaces _tokenIds.current()
        return _tokenIds;
    }

    // ─── Token URI ────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "DegreeRegistry: Token does not exist");
        Degree memory degree = _degrees[tokenId];

        return string(abi.encodePacked(
            "data:application/json;base64,",
            _encodeBase64(
                abi.encodePacked(
                    '{"name":"', degree.degreeTitle, '",',
                    '"description":"BlockDegree Certificate - ', degree.institutionName, '",',
                    '"attributes":[',
                    '{"trait_type":"Student","value":"', degree.studentName, '"},',
                    '{"trait_type":"Certificate Number","value":"', degree.certificateNumber, '"},',
                    '{"trait_type":"Institution","value":"', degree.institutionName, '"},',
                    '{"trait_type":"Status","value":"', degree.isRevoked ? "Revoked" : "Valid", '"}',
                    ']}'
                )
            )
        ));
    }

    function _encodeBase64(bytes memory data) internal pure returns (string memory) {
        bytes memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 len = data.length;
        if (len == 0) return "";

        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);

        for (uint256 i = 0; i < len; i += 3) {
            uint256 a = uint8(data[i]);
            uint256 b = i + 1 < len ? uint8(data[i + 1]) : 0;
            uint256 c = i + 2 < len ? uint8(data[i + 2]) : 0;

            result[(i / 3) * 4] = TABLE[a >> 2];
            result[(i / 3) * 4 + 1] = TABLE[((a & 3) << 4) | (b >> 4)];
            result[(i / 3) * 4 + 2] = i + 1 < len ? TABLE[((b & 15) << 2) | (c >> 6)] : bytes1("=");
            result[(i / 3) * 4 + 3] = i + 2 < len ? TABLE[c & 63] : bytes1("=");
        }

        return string(result);
    }
}