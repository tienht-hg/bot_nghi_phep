const fs = require('fs');
const path = require('path');

class ManagerMapping {
    constructor() {
        this.managerMap = new Map(); // Map<string, string[]> - name -> array of discord IDs
        this.isLoaded = false;
    }

    /**
     * Load manager data from JSON file
     * JSON format: { "managers": [{ "fullName": "...", "discordId": "..." }] }
     */
    loadManagerData() {
        try {
            const jsonPath = path.join(__dirname, '../../managers.json');

            if (!fs.existsSync(jsonPath)) {
                console.error('❌ File managers.json không tồn tại tại:', jsonPath);
                return false;
            }

            // Read JSON file
            const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
            const data = JSON.parse(jsonContent);

            // Validate data structure
            if (!data.managers || !Array.isArray(data.managers)) {
                console.error('❌ Invalid JSON structure. Expected { "managers": [...] }');
                return false;
            }

            // Load managers into map
            for (const manager of data.managers) {
                const { fullName, discordId, discordIds } = manager;

                // Support both old format (discordId) and new format (discordIds array)
                let ids = [];
                if (discordIds && Array.isArray(discordIds)) {
                    ids = discordIds.filter(id => /^\d+$/.test(id)).map(id => id.trim());
                } else if (discordId && /^\d+$/.test(discordId)) {
                    ids = [discordId.trim()];
                }

                // Validate required fields
                if (fullName && ids.length > 0) {
                    this.managerMap.set(fullName.trim(), ids);
                } else {
                    console.warn(`⚠️ Skipping invalid manager entry:`, manager);
                }
            }

            this.isLoaded = true;
            console.log(`✅ Loaded ${this.managerMap.size} managers from managers.json`);
            return true;

        } catch (error) {
            console.error('❌ Error loading manager data from JSON:', error);
            return false;
        }
    }

    /**
     * Get Discord IDs by manager name (exact match, case-sensitive)
     * @param {string} managerName - Manager's full name
     * @returns {string[]|null} Array of Discord IDs or null if not found
     */
    getManagerIdsByName(managerName) {
        if (!this.isLoaded) {
            console.error('⚠️ Manager data not loaded. Call loadManagerData() first.');
            return null;
        }

        const trimmedName = managerName.trim();
        return this.managerMap.get(trimmedName) || null;
    }

    /**
     * Get Discord ID by manager name (backward compatibility - returns first ID)
     * @param {string} managerName - Manager's full name
     * @returns {string|null} Discord ID or null if not found
     * @deprecated Use getManagerIdsByName() instead
     */
    getManagerIdByName(managerName) {
        const ids = this.getManagerIdsByName(managerName);
        return ids && ids.length > 0 ? ids[0] : null;
    }

    /**
     * Get all manager names
     * @returns {Array<string>} Array of all manager names
     */
    getAllManagerNames() {
        if (!this.isLoaded) {
            console.error('⚠️ Manager data not loaded. Call loadManagerData() first.');
            return [];
        }

        return Array.from(this.managerMap.keys());
    }

    /**
     * Check if a manager name exists in the system
     * @param {string} managerName - Manager's full name
     * @returns {boolean}
     */
    hasManager(managerName) {
        if (!this.isLoaded) return false;
        return this.managerMap.has(managerName.trim());
    }

    /**
     * Get total number of managers loaded
     * @returns {number}
     */
    getManagerCount() {
        return this.managerMap.size;
    }
}

// Export singleton instance
module.exports = new ManagerMapping();
