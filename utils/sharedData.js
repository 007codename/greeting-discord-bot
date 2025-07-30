// utils/sharedData.js - Shared data storage
// Simple in-memory storage for tracking how users joined
// Note: This will reset when bot restarts, but it's a simple solution
const userJoinSources = new Map();

module.exports = {
    userJoinSources
};