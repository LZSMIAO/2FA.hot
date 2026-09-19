# 功能建议 / Feature suggestions

想加什么功能，或哪里不好用？欢迎提建议。下面的功能还没做好，暂无上线时间。

[网站功能页](https://2fa.hot/zh-CN/waitlist) · [提建议](https://github.com/LZSMIAO/2fa-hot/issues/new?template=feature-request.yml) · [查看已有建议](https://github.com/LZSMIAO/2fa-hot/issues?q=is%3Aissue%20label%3Aenhancement)

## 怎么提交

先看看有没有相同建议，有的话可以在原讨论里补充。新建议说清想做什么、哪里不好用就行。

提交需要登录 GitHub，内容公开。请勿附上真实密钥、密码、账号二维码或备份文件。安全问题请用[私密报告](https://github.com/LZSMIAO/2fa-hot/security/advisories/new)。

Suggestions are welcome in any language. Check for similar issues first, then describe the problem and what you would like to change. Posting requires a GitHub account. Posts are public; do not include secrets or private account data.

## 临时分享验证码

**尚未上线。** 计划让你临时向别人提供验证码，密钥留在自己的设备上。

初步方案：你保持在线，在浏览器里生成验证码，再发送给指定的人。可以设置分享时间，也可以提前停止。

- 对方已收到的验证码无法收回，已经登录的会话也不会因此退出。
- 你离线后就无法继续提供验证码；手机进入后台也可能中断分享。
- 对方仍然可以复制或转发收到的验证码。

开始开发前，还需要确定接收人验证、加密传输和断线处理方式。分享链接不会包含原始密钥。

**Not available yet.** The plan is to share codes temporarily while keeping the secret on your device. You would need to stay online and could set a time limit or stop sharing. Codes already received cannot be taken back, and stopping sharing would not end existing logins. Recipient verification, encrypted delivery and reconnection still need to be designed.
