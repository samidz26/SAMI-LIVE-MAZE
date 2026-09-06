const {
    WebcastEvent,
    ControlEvent
} = require("tiktok-live-connector");


function registerTikTokEvents(
    connection,
    options = {}
) {

    if (!connection) {

        throw new Error(
            "TikTok connection is required"
        );
    }


    const {
        onChat,
        onGift,
        onFollow,
        onSubscribe,
        onMember,
        onConnected,
        onDisconnected,
        onError
    } = options;


    /* ===============================
       CONNECTED
    =============================== */

    connection.on(
        "connected",
        data => {

            if (
                typeof onConnected ===
                "function"
            ) {

                onConnected(data);
            }
        }
    );


    /* ===============================
       CHAT
    =============================== */

    connection.on(
        WebcastEvent.CHAT,
        data => {

            if (
                typeof onChat ===
                "function"
            ) {

                onChat(data);
            }
        }
    );


    /* ===============================
       GIFT
    =============================== */

    connection.on(
        WebcastEvent.GIFT,
        data => {

            if (
                typeof onGift ===
                "function"
            ) {

                onGift(data);
            }
        }
    );


    /* ===============================
       FOLLOW
    =============================== */

    connection.on(
        WebcastEvent.FOLLOW,
        data => {

            if (
                typeof onFollow ===
                "function"
            ) {

                onFollow(data);
            }
        }
    );


    /* ===============================
       SUBSCRIBE
    =============================== */

    connection.on(
        WebcastEvent.SUBSCRIBE,
        data => {

            if (
                typeof onSubscribe ===
                "function"
            ) {

                onSubscribe(data);
            }
        }
    );


    /* ===============================
       MEMBER
    =============================== */

    connection.on(
        WebcastEvent.MEMBER,
        data => {

            if (
                typeof onMember ===
                "function"
            ) {

                onMember(data);
            }
        }
    );


    /* ===============================
       ERROR
    =============================== */

    connection.on(
        ControlEvent.ERROR,
        error => {

            console.error(
                "[TikTok] Error:",
                error
            );


            if (
                typeof onError ===
                "function"
            ) {

                onError(error);
            }
        }
    );


    /* ===============================
       DISCONNECTED
    =============================== */

    connection.on(
        "disconnected",
        data => {

            if (
                typeof onDisconnected ===
                "function"
            ) {

                onDisconnected(data);
            }
        }
    );


    return connection;
}


module.exports = {
    registerTikTokEvents
};
