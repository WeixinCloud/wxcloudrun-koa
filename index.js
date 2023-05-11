const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fetch = require('node-fetch');
const fs = require("fs");
const path = require("path");
const { init: initDB, Counter } = require("./db");

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");

// 首页
router.get("/", async (ctx) => {
  ctx.body = homePage;
});

// 更新计数
router.post("/api/count", async (ctx) => {
  const { request } = ctx;
  const { action } = request.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }

  ctx.body = {
    code: 0,
    data: await Counter.count(),
  };
});

// 获取计数
router.get("/api/count", async (ctx) => {
  const result = await Counter.count();

  ctx.body = {
    code: 0,
    data: result,
  };
});

// 小程序调用，获取微信 Open ID
router.get("/api/wx_openid", async (ctx) => {
  if (ctx.request.headers["x-wx-source"]) {
    ctx.body = ctx.request.headers["x-wx-openid"];
  }
});

async function getAIResponse(prompt) {
  try {
    const response = await fetch('https://openai.asherjia.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
      }),
    });
    const completion = await response.json();
    return (completion?.data?.choices?.[0].text || 'AI 挂了').trim();
  } catch (error) {
    return ('AI 挂了!').trim();
  }
}

router.post('/message/post', async ctx => {
  const { ToUserName, FromUserName, Content } = ctx.request.body;

  const response = await getAIResponse(Content);
  
  ctx.body = {
    ToUserName: FromUserName,
    FromUserName: ToUserName,
    CreateTime: +new Date(),
    MsgType: 'text',
    
    Content: response,
  };
});

const app = new Koa();
app
  .use(logger())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

const port = process.env.PORT || 80;
async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}
bootstrap();
