<p align="center">
      <strong>
        <a href="https://github.com/nICEnnnnnnnLee/GithubSoEasy" target="_blank">GithubSoEasy</a>&nbsp;
      </strong>
  <br>
        使用Cloudflare Workers代理加速Github访问
  <br>
      源自<strong>
        <a href="https://github.com/ButterAndButterfly" target="_blank">ButterAndButterfly</a><br>
      </strong>  
        Butter, 寓意宅男; Butterfly, 寓意美好的事物。 
        <br/> 美好的世界由我们创造!  
</p>


## 完成度  
- [x] Github页面访问  
- [x] Github显示图片、头像  
- [x] Github项目压缩包下载  
- [x] Github Release附件下载  
- [x] Git over HTTPS，可以通过类似链接`https://github.com/nICEnnnnnnnLee/GithubSoEasy.git`进行push、pull等操作  
- [x] Github登录？  
在`/login`路径提供了一个简单的设置cookie的界面, 设置以后：
  + 可访问私人repo、首页动态、Code类型搜索等大多数读操作
  + **不可以**Star、Fork、更改设置等增删改操作    


## 被 Netcraft 击落了
某域名被Netcraft投诉abuse，看了cloudflare给的邮件，提交的证据图片大概样子如下：
```
您无权访问
Browser UA: 某个iOS的UA
```
感觉挺抽象的。  
常规的爬虫或者正常的访问不可能检测到首页有Github内容，只能说Netcraft不是什么好鸟。  
另外这种图片能被作为钓鱼的证据，让CF停用域名，挺蛋疼的。  
综上，**本项目请慎重使用，有被投诉abuse的风险**。


## 关于反 Netcraft反钓鱼
  请看前一章节，效果不太保险。建议有能力的自行魔改。    
  镜像整个网站可能被netcraft扫描到，然后投诉，然后service taken down。你可以参考以下预防措施：  
  + 域名只对中国大陆开放  
  + `index.js`中设置`anti_spam_mode = 301_page_index`  
    + 这意味着，在没有登录的时候，主页会301跳转到github
  + `index.js`中设置`anti_spam_mode = check_cookie`  
    + 这意味着，你的**浏览器**需要先访问特定的url获得授权，之后才能正常访问。  
    这里，特定的url指的是`index.js`中的`valid_cookie_set_path`
    + 这意味着，你的**Git客户端**的UserAgent需要符合前缀，然后才能正常使用。  
    这里，特定的前缀指的是`index.js`中的`valid_user_agent_prefix`


## 项目搭建实现的心路历程  
+ 先实现单一域名`github.com`最粗糙的代理(只修改url)  
+ 实现请求header保持一致，大致处理一下`host`、`referer`、`origin`的域名  
+ 实现回复header保持一致，大致处理一下`30x location`、`x-pjax-url`  
+ 处理html回复中可能存在的超链接文本，对其进行替换  
+ 通过F12查看网络请求，进行各种日常操作，将可能存在的域名均进行替换，并对后台进行报错处理  


## 实现步骤  
**如果**你会一点点python, 并且注册了账号，可以跳至**辅助Python脚本**
1. 首页：https://workers.cloudflare.com
2. 注册，登入，Start building，取一个子域名Create a Worker。
3. 复制 index.js 到左侧代码框，修改代码并保存。  
    ```js
    const your_domain = '<你的自定义域名>'
    ```
    ps: 你也可以修改环境变量`HOME_DOMAIN`为你的域名

4. 将worker连接到自定义域名`git`、`gist`、`gist-notebooks`、`gist-ucontent`、`raw`、`assets`、`avatars`、`camo`、`codeload`、`releases`、`object`。  
    ```
    假设你的域名为 test.com,
    需要设置的域名为
    git.test.com
    gist.test.com
    gist-notebooks.test.com
    gist-ucontent.test.com
    raw.test.com
    assets.test.com
    avatars.test.com
    camo.test.com
    codeload.test.com
    releases.test.com
    object.test.com
    ```
    具体操作可以查看issue [如何Worker 连接到自定义域](https://github.com/nICEnnnnnnnLee/GithubSoEasy/issues/3)



## 辅助Python脚本  
+ 你需要获取Global API Key： -> [传送门](https://dash.cloudflare.com/profile/api-tokens)
+ 你需要以下两个文件
  + `create_workers.py`
  + `index.js`

+ 修改`create_workers.py`
```
YOUR_EMAIL = "你的邮箱"
YOUR_API_KEY = "你的全局API_KEY"
HOME_DOMAIN = "a.b.c" # 当前cloudflare账号控制的域名
```

+ 修改后直接运行
```
pip install requests
python create_workers.py
```

## 其它
+ 如果你希望主域名为`example.com`的样式，而不是`git.example.com`，可以将相关代码注释、去注释，并自行添加路由。  
  25行左右:
  ```js
  // [`${domain}`, 'github.com'],
  [`git.${domain}`, 'github.com'],
  ```
  变为：
  ```js
  [`${domain}`, 'github.com'],
  // [`git.${domain}`, 'github.com'],
  ```

