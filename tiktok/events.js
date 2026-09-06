function registerTikTokEvents(connection, options) {

    if (!connection) {
        throw new Error("TikTok connection is required");
    }

    const {
        onChat,
        onGift,
        onFollow,
        onSubscribe,
        onMember
    } = options || {};

    connection.on("chat", data => {

        if (typeof onChat === "function") {
            onChat(data);
        }

    });

    connection.on("gift", data => {

        if (typeof onGift === "function") {
            onGift(data);
        }

    });

    connection.on("follow", data => {

        if (typeof onFollow === "function") {
            onFollow(data);
        }

    });

    connection.on("subscribe", data => {

        if (typeof onSubscribe === "function") {
            onSubscribe(data);
        }

    });

    connection.on("member", data => {

        if (typeof onMember === "function") {
            onMember(data);
        }

    });

    return connection;
}


module.exports = {
    registerTikTokEvents
};
