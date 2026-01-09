// utils/memberDatabase.js - Member join tracking database
const fs = require('fs');
const path = require('path');

const MEMBERS_PATH = path.join(__dirname, '../data/members.json');

// Ensure database file exists
function ensureDatabaseExists() {
    if (!fs.existsSync(path.dirname(MEMBERS_PATH))) {
        fs.mkdirSync(path.dirname(MEMBERS_PATH), { recursive: true });
    }
    if (!fs.existsSync(MEMBERS_PATH)) {
        fs.writeFileSync(MEMBERS_PATH, '{}');
    }
}

// Load member join data
function loadMemberData() {
    try {
        ensureDatabaseExists();
        const data = fs.readFileSync(MEMBERS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading member data:', error);
        return {};
    }
}

// Save member join data
function saveMemberData(memberData) {
    try {
        ensureDatabaseExists();
        fs.writeFileSync(MEMBERS_PATH, JSON.stringify(memberData, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving member data:', error);
        return false;
    }
}

// Add a member to tracking
function addMember(userId, joinSource) {
    const memberData = loadMemberData();
    memberData[userId] = joinSource;
    return saveMemberData(memberData);
}

// Get member join source
function getMemberJoinSource(userId) {
    const memberData = loadMemberData();
    return memberData[userId] || null;
}

// Remove member from tracking
function removeMember(userId) {
    const memberData = loadMemberData();
    if (memberData[userId]) {
        delete memberData[userId];
        return saveMemberData(memberData);
    }
    return true;
}

// Get all tracked members
function getAllMembers() {
    return loadMemberData();
}

// Get member count
function getMemberCount() {
    const memberData = loadMemberData();
    return Object.keys(memberData).length;
}

module.exports = {
    addMember,
    getMemberJoinSource,
    removeMember,
    getAllMembers,
    getMemberCount,
    loadMemberData,
    saveMemberData
};