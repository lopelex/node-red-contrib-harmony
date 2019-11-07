module.exports = (value, defaultValue) => {

    if (typeof value == 'boolean' || value instanceof Boolean) {
        return value;
    }
    if (typeof value == 'string' || value instanceof String) {
        value = value.trim().toLowerCase();
        if (value === 'false' || value === '0' || value === 'off') {
            return false;
        }
    }
    if (typeof value == 'number' || value instanceof Number) {
        if (value === 0) {
            return false;
        }
    }
    return defaultValue;
};
