import * as venom from 'venom-bot';
import axios from 'axios';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

interface Session {
    name: string,
    qrcode: any,
    client: any,
    status: string,
    state: string
}

interface RequestReturn {
    result: string;
    message: string;
}

let sessions: Array<Session> = [];

export const create = async (sessionName: string): Promise<any> => {
    let session = getSession(sessionName);

    if (session != null && session.client != false) {
        console.log("Status", session.status);
        return;
    }

    session = addSession(sessionName);
}

const initSession = (sessionName: string): any => {
    const session = getSession(sessionName);

    const client: any = venom.create(
        sessionName,
        (base64Qr: any, base64Qrimg: any) => {
            session.state = "QRCODE";
            session.qrcode = (base64Qr ? base64Qr : base64Qrimg);
        },
        (statusFind: string) => {
            session.status = statusFind;
            console.log("session.status: " + session.status);
        },
        {
            headless: true,
            devtools: false,
            useChrome: false,
            debug: false,
            logQR: false,
            browserArgs: [
                '--log-level=3',
                '--no-default-browser-check',
                '--disable-site-isolation-trials',
                '--no-experiments',
                '--ignore-gpu-blacklist',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-default-apps',
                '--enable-features=NetworkService',
                '--disable-setuid-sandbox',
                '--no-sandbox',
                // Extras
                '--disable-webgl',
                '--disable-threaded-animation',
                '--disable-threaded-scrolling',
                '--disable-in-process-stack-traces',
                '--disable-histogram-customizer',
                '--disable-gl-extensions',
                '--disable-composited-antialiasing',
                '--disable-canvas-aa',
                '--disable-3d-apis',
                '--disable-accelerated-2d-canvas',
                '--disable-accelerated-jpeg-decoding',
                '--disable-accelerated-mjpeg-decode',
                '--disable-app-list-dismiss-on-blur',
                '--disable-accelerated-video-decode',
            ],
            autoClose: 60 * 60 * 24 * 365 //never
        }
    ).then((client) => {
        start(client, session);
        session.client = client;
    })
        .catch((erro) => {
            console.log(erro);
        });

    return client;
}

const start = (client: any, session: Session): void => {
    client.onMessage(async (message: any) => {
        if (message.isGroupMsg === false) {

            if (process.env.WEBHOOK && process.env.WEBHOOK.length > 0) {

                const body = await sanitizeMessage(session.name, message, client);

                axios.post(process.env.WEBHOOK, body)
                    .then((response) => {
                        console.log('response', response);
                    }).catch((error) => {
                        console.log('erorr', error);
                    })
            }
        }
    });
    client.onStateChange((state: string) => {
        session.state = state;
        console.log("session.state: " + state);
    });
}

const addSession = (sessionName: string): Session => {
    var newSession = {
        name: sessionName,
        qrcode: false,
        client: false,
        status: 'notLogged',
        state: 'STARTING'
    }
    sessions.push(newSession);
    console.log("newSession.state: " + newSession.state);

    newSession.client = initSession(sessionName);

    return newSession;
}

export const getSession = (sessionName: string): Session => {
    let foundSession: Session | any = null;

    if (sessions) {
        sessions.forEach(session => {
            if (sessionName == session.name) {
                foundSession = session;
            }
        });
    }

    return foundSession;
}

export const sendText = async (sessionName: string, number: string, text: string): Promise<RequestReturn> => {
    var session = getSession(sessionName);

    if (!session) {
        return { result: "error", message: "Session not found" };
    }

    if (!["inChat", "isLogged"].includes(session.status)) {
        return { result: "error", message: `Current status: ${session.state}` };
    }

    await session.client.sendText(number + '@c.us', text);

    return { result: "sucess", message: "Message sent" };
}

export const getProfilePic = async (sessionName: string, number: string): Promise<any> => {
    var session = getSession(sessionName);

    if (!session) {
        return { result: "error", message: "Session not found" };
    }

    if (!["inChat", "isLogged"].includes(session.status)) {
        return { result: "error", message: `Current status: ${session.state}` };
    }

    return await session.client.getProfilePicFromServer(number + '@c.us');
}

export const sendImage = async (sessionName: string, number: string, fileName: string, file: any, caption: string): Promise<RequestReturn> => {
    var session = getSession(sessionName);

    if (!session) {
        return { result: "error", message: "Session not found" };
    }

    if (!["inChat", "isLogged"].includes(session.status)) {
        return { result: "error", message: `Current status: ${session.state}` };
    }

    await session.client.sendImage(number + '@c.us', file, fileName, caption);

    return { result: "sucess", message: "Image sent" };
}

export const sendFile = async (sessionName: string, number: string, fileName: string, file: any, caption: string): Promise<RequestReturn> => {
    var session = getSession(sessionName);

    if (!session) {
        return { result: "error", message: "Session not found" };
    }

    if (!["inChat", "isLogged"].includes(session.status)) {
        return { result: "error", message: `Current status: ${session.state}` };
    }

    await session.client.sendFile(number + '@c.us', file, fileName, caption);

    return { result: "sucess", message: "File sent" };
}

export const closeSession = async (sessionName: string): Promise<RequestReturn> => {
    var session = getSession(sessionName);

    if (!session) {
        return { result: "error", message: "Session not found" };
    }

    if (!["inChat", "isLogged"].includes(session.status)) {
        return { result: "error", message: `Current status: ${session.state}` };
    }

    try {
        await session.client.close();
        session.state = "CLOSED";
        session.client = false;

        fs.unlinkSync("./tokens/" + sessionName + ".data.json");

        return { result: "success", message: "Session closed" };
    } catch (error) {
        return { result: "error", message: error.message };
    }
}

const sanitizeMessage = async (sessionName: string, data: any, client: any): Promise<Object> => {

    if (data.isMedia == true || data.type == 'ptt') {
        data.body = await await client.downloadMedia(data);
    }

    const message = {
        messages: [{
            id: (data.id ? data.id : null),
            body: (data.body ? data.body : null),
            filelink: (data.id ? data.id : null),
            fromMe: false,
            self: 0,
            isForwarded: (data.isForwarded ? data.isForwarded : null),
            author: (data.from ? data.from : null),
            time: (data.t ? data.t : null),
            lat: (data.lat ? data.lat : null),
            lng: (data.lng ? data.lng : null),
            chatId: (data.chatId ? data.chatId : null),
            type: (data.type ? data.type : null),
            senderName: data.sender.pushname,
            caption: (data.caption ? data.caption : null),
            quotedMsgBody: (data.quotedMsgObj ? data.quotedMsgObj : null),
            chatName: data.sender.pushname,
        }],
        sessionName: sessionName
    };
    return message;
}