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


## 演示站点  
<https://git.n1cee.workers.dev>  
资源有限，仅供演示用。  

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
    const your_domain = '<你的自定义域名>.workers.dev'
    ```
    ps: 你也可以修改环境变量`HOME_DOMAIN`为你的域名

4. 再参考步骤2~3，另外重复建立7个worker
5. 将8个worker重命名为`git`、`raw`、`assets`、`avatars`、`camo`、`codeload`、`releases`、`object`
6. 收藏地址框中的 `https://git.子域名.workers.dev`，以后可直接访问。  

看不懂？点击<a href="https://nICEnnnnnnnLee.github.io/blog/2021/08/25/cloudflare-workers-github-proxy/" ><strong>这里</strong></a>傻瓜式超细致图文指导



## 辅助Python脚本  
+ 你需要获取Global API Key： -> [传送门](https://dash.cloudflare.com/profile/api-tokens)
+ 你需要以下两个文件
  + `create_workers.py`
  + `index.js`
+ 如果你想利用现成的`xxx.workers.dev`域名，请修改`create_workers.py`
```
YOUR_EMAIL = "你的邮箱"
YOUR_API_KEY = "你的全局API_KEY"
```

+ 如果你想自定义成自己的域名，请修改`create_workers.py`
```
YOUR_EMAIL = "你的邮箱"
YOUR_API_KEY = "你的全局API_KEY"
HOME_DOMAIN = None # 当自定义域名时填入类似'xxx.com'，否则为空
```

+ 修改后直接运行
```
pip install requests
python create_workers.py
```