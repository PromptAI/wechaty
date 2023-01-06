const { WechatyBuilder, log } = require("wechaty");
const { onLogin, onLogout, onMessage, onScan } = require("./chat/message");

const bot = WechatyBuilder.build({
  name: "ding-dong-bot",
  puppet: "wechaty-puppet-wechat4u",
});

const onMessageWithBot = async (msg) => {
  await onMessage(msg, bot);
};
bot.on("scan", onScan);
bot.on("login", onLogin);
bot.on("logout", onLogout);
bot.on("message", onMessageWithBot);

bot
  .start()
  .then(() => log.info("StarterBot", "Starter Bot Started."))
  .catch((e) => log.error("StarterBot", e));
