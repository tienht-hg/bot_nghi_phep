const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'pendingRequests.json');

/**
 * Utility module for persistent storage of pending leave requests
 * Data is stored in data/pendingRequests.json
 */
class PendingRequestsStore {
    constructor() {
        this.ensureDataDir();
    }

    /**
     * Ensure data directory exists
     */
    ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log('📁 Created data directory');
        }
    }

    /**
     * Load all pending requests from file
     * @returns {Map} Map of pending requests
     */
    load() {
        try {
            if (!fs.existsSync(FILE_PATH)) {
                return new Map();
            }

            const data = fs.readFileSync(FILE_PATH, 'utf8');
            const parsed = JSON.parse(data);

            // Convert object to Map
            const map = new Map(Object.entries(parsed));
            console.log(`📂 Đã khôi phục ${map.size} đơn chờ duyệt từ file`);
            return map;
        } catch (error) {
            console.error('❌ Error loading pending requests:', error.message);
            return new Map();
        }
    }

    /**
     * Save all pending requests to file
     * @param {Map} pendingRequests - Map of pending requests
     */
    save(pendingRequests) {
        try {
            this.ensureDataDir();

            // Convert Map to object for JSON storage
            const data = Object.fromEntries(pendingRequests);
            fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ Error saving pending requests:', error.message);
        }
    }

    /**
     * Add a new pending request and save to file
     * @param {string} key - Request key
     * @param {Object} data - Request data
     * @param {Map} pendingRequests - Current pending requests Map
     */
    add(key, data, pendingRequests) {
        pendingRequests.set(key, data);
        this.save(pendingRequests);
        console.log(`💾 Đã lưu đơn ${key} vào file`);
    }

    /**
     * Remove a pending request and save to file
     * @param {string} key - Request key
     * @param {Map} pendingRequests - Current pending requests Map
     */
    remove(key, pendingRequests) {
        pendingRequests.delete(key);
        this.save(pendingRequests);
        console.log(`🗑️ Đã xóa đơn ${key} khỏi file`);
    }

    /**
     * Get file path (for debugging)
     */
    getFilePath() {
        return FILE_PATH;
    }
}

module.exports = new PendingRequestsStore();
