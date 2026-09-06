function log(message, data = null) {

    if (data !== null) {
        console.log(`[SAMI LIVE] ${message}`, data);
    } else {
        console.log(`[SAMI LIVE] ${message}`);
    }
}


function info(message, data = null) {

    if (data !== null) {
        console.info(`[INFO] ${message}`, data);
    } else {
        console.info(`[INFO] ${message}`);
    }
}


function warn(message, data = null) {

    if (data !== null) {
        console.warn(`[WARN] ${message}`, data);
    } else {
        console.warn(`[WARN] ${message}`);
    }
}


function error(message, err = null) {

    if (err) {
        console.error(`[ERROR] ${message}`, err);
    } else {
        console.error(`[ERROR] ${message}`);
    }
}


function success(message, data = null) {

    if (data !== null) {
        console.log(`[SUCCESS] ${message}`, data);
    } else {
        console.log(`[SUCCESS] ${message}`);
    }
}


module.exports = {
    log,
    info,
    warn,
    error,
    success
};
