function normalizeUsername(username) {

    return String(username || "")
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
}


function getAvatarUrl(user) {

    if (!user) {
        return "";
    }

    if (typeof user.profilePictureUrl === "string") {
        return user.profilePictureUrl;
    }

    if (user.profilePictureUrl?.urlList?.length) {
        return user.profilePictureUrl.urlList[0];
    }

    if (Array.isArray(user.avatarLarger)) {
        return user.avatarLarger[0] || "";
    }

    if (typeof user.avatarLarger === "string") {
        return user.avatarLarger;
    }

    if (Array.isArray(user.avatarMedium)) {
        return user.avatarMedium[0] || "";
    }

    if (typeof user.avatarMedium === "string") {
        return user.avatarMedium;
    }

    if (Array.isArray(user.avatarThumb)) {
        return user.avatarThumb[0] || "";
    }

    if (typeof user.avatarThumb === "string") {
        return user.avatarThumb;
    }

    return "";
}


function isValidDirection(direction) {

    const value = String(direction || "")
        .trim()
        .toLowerCase();

    return [
        "u",
        "d",
        "r",
        "l",
        "up",
        "down",
        "right",
        "left",
        "أعلى",
        "أسفل",
        "يمين",
        "يسار",
        "فوق",
        "تحت"
    ].includes(value);
}


function getRandomNumber(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


function delay(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


module.exports = {
    normalizeUsername,
    getAvatarUrl,
    isValidDirection,
    getRandomNumber,
    delay
};
