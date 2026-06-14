// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DegreeRegistry {

    address public owner;

    struct Degree {
        string  degreeId;
        string  studentName;
        string  registrationNumber;
        string  department;
        string  program;
        string  cgpa;
        string  graduationYear;
        string  degreeHash;
        address issuerAddress;
        uint256 timestamp;
        bool    isValid;
        bool    isRevoked;
    }

    mapping(string => Degree) private degrees;
    mapping(string => string[]) private studentDegrees;
    mapping(string => string) private hashToDegreeId;
    uint256 public totalDegrees;

    event DegreeIssued(string indexed degreeId, string indexed registrationNumber, string degreeHash, address issuerAddress, uint256 timestamp);
    event DegreeVerified(string indexed degreeId, bool isValid, uint256 timestamp);
    event DegreeRevoked(string indexed degreeId, address revokedBy, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function issueDegree(
        string memory _degreeId,
        string memory _studentName,
        string memory _registrationNumber,
        string memory _department,
        string memory _program,
        string memory _cgpa,
        string memory _graduationYear,
        string memory _degreeHash
    ) public onlyOwner {
        require(bytes(degrees[_degreeId].degreeId).length == 0, "Degree ID already exists");
        require(bytes(hashToDegreeId[_degreeHash]).length == 0, "Hash already exists");

        degrees[_degreeId] = Degree({
            degreeId: _degreeId,
            studentName: _studentName,
            registrationNumber: _registrationNumber,
            department: _department,
            program: _program,
            cgpa: _cgpa,
            graduationYear: _graduationYear,
            degreeHash: _degreeHash,
            issuerAddress: msg.sender,
            timestamp: block.timestamp,
            isValid: true,
            isRevoked: false
        });

        studentDegrees[_registrationNumber].push(_degreeId);
        hashToDegreeId[_degreeHash] = _degreeId;
        totalDegrees++;

        emit DegreeIssued(_degreeId, _registrationNumber, _degreeHash, msg.sender, block.timestamp);
    }

    function getDegree(string memory _degreeId) public view returns (
        string memory, string memory, string memory, string memory,
        string memory, string memory, string memory, string memory,
        address, uint256, bool, bool
    ) {
        Degree storage d = degrees[_degreeId];
        require(bytes(d.degreeId).length > 0, "Degree does not exist");
        return (d.studentName, d.registrationNumber, d.department, d.program,
                d.cgpa, d.graduationYear, d.degreeHash, d.degreeId,
                d.issuerAddress, d.timestamp, d.isValid, d.isRevoked);
    }

    function verifyByHash(string memory _degreeHash) public view returns (
        bool exists, bool isValid, bool isRevoked, string memory degreeId
    ) {
        string memory dId = hashToDegreeId[_degreeHash];
        if (bytes(dId).length == 0) return (false, false, false, "");
        Degree storage d = degrees[dId];
        return (true, d.isValid, d.isRevoked, dId);
    }

    function revokeDegree(string memory _degreeId) public onlyOwner {
        require(bytes(degrees[_degreeId].degreeId).length > 0, "Degree does not exist");
        require(!degrees[_degreeId].isRevoked, "Already revoked");
        degrees[_degreeId].isRevoked = true;
        degrees[_degreeId].isValid = false;
        emit DegreeRevoked(_degreeId, msg.sender, block.timestamp);
    }

    function getStudentDegrees(string memory _registrationNumber) public view returns (string[] memory) {
        return studentDegrees[_registrationNumber];
    }
}