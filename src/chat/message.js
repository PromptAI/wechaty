import {ScanStatus, log} from "wechaty";
import qrTerm from "qrcode-terminal";
import {applyChat, sendMsg} from "./chatbot.js"
import {FileBox} from 'file-box'
import {getBaseUrl} from '../utils/request.js'

let username
let chatSession = {}

export function onScan(qrcode, status) {
    if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
        qrTerm.generate(qrcode, {small: true}); // show qrcode on console

        const qrcodeImageUrl = [
            "https://wechaty.js.org/qrcode/",
            encodeURIComponent(qrcode),
        ].join("");

        log.info(
            "StarterBot",
            "onScan: %s(%s) - %s",
            ScanStatus[status],
            status,
            qrcodeImageUrl
        );
    } else {
        log.info("StarterBot", "onScan: %s(%s)", ScanStatus[status], status);
    }
}

export function onLogin(user) {
    log.info("StarterBot", "%s login", user);
    username = user.name()
}

export function onLogout(user) {
    log.info("StarterBot", "%s logout", user);
    username = user.name()
}

export async function onMessage(message, bot) {

    log.info("StarterBot ******", JSON.stringify(message));
    let msg = message.text();
    let talkerId = message?.payload?.talkerId

    // 1. 会话初始化
    if (msg.startsWith("@" + username + ' 初始化会话') || chatSession[talkerId] === undefined) {
        return await initChat(talkerId, message, bot)
    }
    // 2. 处理发送的消息
    let chatId = chatSession[talkerId]
    log.info(`talkerId:${talkerId}, chatId:${chatId}`)
    if (msg.startsWith("@" + username) && chatId !== undefined) {

        log.info(`'rec from:'${talkerId},message:${msg} `)
        let chatMsg = msg.substr(username.length + 1);
        let reply = await sendMsg(chatId, chatMsg, chatMsg);

        log.info(`msg reply from bot:${JSON.stringify(reply)}`)
        await processMessage(reply, message, bot)
    }
}

export async function initChat(talkerId, message, bot) {
    let chatId = await applyChat();
    chatSession[talkerId] = chatId;
    let reply = await sendMsg(chatId, '/init', '/init');
    if (reply) {
        return await processMessage(reply, message, bot)
    } else {
        log.info('init chat failed!')
        return await message.say('初始化会话失败！')
    }
}


export function decodeAttachmentText(value) {
    try {
        return JSON.parse(decodeURIComponent(value));
    } catch (e) {
        //
    }
    return {name: '-', href: '#', type: 'null', version: '0.0.1'};
}

export function encodeAttachmentText(value) {
    return encodeURIComponent(JSON.stringify(value));
}

// %7B%22name%22%3A%22trash.png.svg%22%2C%22type%22%3A%22svg%22%2C%22href%22%3A%22%2Fapi%2Fblobs%2Fget%2Fa1_c4fjhb1rer5s%22%2C%22version%22%3A%220.0.1%22%7D
export function isAttachment(value) {
    if (!value) return false;
    if (value.startsWith('%7B%22') && value.endsWith('%22%7D')) return true;
    return false;
}

export async function processMessage(reply, message, bot) {
    const answers =
        reply.answers?.length > 0
            ? reply.answers.filter((m) => !m.custom)
            : [{text: '换个问题试一试'}];

    log.info(`'rec ans:'${JSON.stringify(answers)}`)
    for (let i = 0; i < answers.length; i++) {
        let item = answers[i]
        //1. 处理按钮回复 暂时忽略
        if (item?.buttons?.length > 0) {

        }

        //2. 处理图片回复
        if (item.image) {
            log.info(`image url:${getBaseUrl() + item.image}`)
            const fileBox = FileBox.fromUrl(getBaseUrl() + item.image, `${item.image + '.jpeg'}`)
            //发送图片
            await message.say(fileBox)
        }

        //3. 处理文件回复
        if (isAttachment(item.text)) {
            let files = decodeAttachmentText(item.text)
            log.info(`file url: ${getBaseUrl() + files.href}`)

            const fileBox = FileBox.fromUrl(getBaseUrl() + files.href, files.name)
            //发送图片
            await message.say(fileBox)
            return
        }
        //4. 处理文本回复
        if (item.text) {
            await message.say(item.text);
        }
    }
}