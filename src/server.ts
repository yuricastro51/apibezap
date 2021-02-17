import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

import { create, sendImage, getSession, closeSession, getProfilePic, sendText, sendFile } from './sessions';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.listen(process.env.HOST_PORT, () => {
    console.log(`Server running on port ${process.env.HOST_PORT}`);
});

app.get("/start", async (req: Request, res: Response, next: NextFunction) => {

    const sessionName: any = req.query.sessionName?.toString();
    console.log("starting..." + sessionName);

    await create(sessionName);
    res.sendStatus(200);
    next();
});

app.get("/qrcode", async (req: Request, res: Response, next: NextFunction) => {

    const sessionName: any = req.query.sessionName;

    console.log("qrcode..." + sessionName);
    var session = getSession(sessionName);

    if (!session) {
        res.status(502).json({ result: "error", message: "Session not found" });
        return;
    }

    if (session.status == 'isLogged') {
        res.status(502).json({ result: "error", message: "Whatsapp is logged" });
        return;
    }
    if (req.query.image) {

        if (!session.qrcode) {
            res.status(502).json({ result: "error", message: "Whatsapp is logged" });
            return;
        }

        session.qrcode = session.qrcode.replace('data:image/png;base64,', '');
        const imageBuffer = Buffer.from(session.qrcode, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length
        });
        res.end(imageBuffer);
        return;
    }

    res.status(200).json({ result: "success", message: { qrcode: session.qrcode } });

});

app.post("/sendText", async (req: Request, res: Response) => {
    var result = await sendText(
        req.body.sessionName,
        req.body.number,
        req.body.text
    );

    res.json(result);
});

app.post("/sendImage", async (req: Request, res: Response) => {

    var result = await sendImage(
        req.body.sessionName,
        req.body.number,
        req.body.fileName,
        req.body.file,
        req.body.caption
    );
    res.json(result);
});

app.post("/sendFile", async (req: Request, res: Response) => {

    var result = await sendFile(
        req.body.sessionName,
        req.body.number,
        req.body.fileName,
        req.body.file,
        req.body.caption
    );
    res.json(result);
});

app.get("/getProfilePic", async (req: Request, res: Response) => {
    var result = await getProfilePic(
        req.body.sessionName,
        req.body.number
    );

    res.json(result);
});

app.get("/close", async (req: Request, res: Response) => {
    const sessionName: any = req.query.sessionName;
    var result = await closeSession(sessionName);
    res.json(result);
});