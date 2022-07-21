
const your_domain = HOME_DOMAIN || '<你的自定义域名>.workers.dev'
const login_page = 'https://nICEnnnnnnnLee.github.io/GithubSoEasy/login.html'

//返回html时的替换字典
const replace_dicts = {
  'integrity="sha': 'integrity_no="sha' // 去掉完整性校验
}
// 域名指向的路径
const req_dicts = {}

function init(domain) {
  const domain_pair_list = [
    [`git.${domain}`, 'github.com'],
    [`raw.${domain}`, 'raw.githubusercontent.com'],
    [`assets.${domain}`, 'github.githubassets.com'],
    [`avatars.${domain}`, 'avatars.githubusercontent.com'],
    [`camo.${domain}`, 'camo.githubusercontent.com'],
    [`codeload.${domain}`, 'codeload.github.com'],
    [`releases.${domain}`, 'github-releases.githubusercontent.com'],
    [`object.${domain}`, 'objects.githubusercontent.com'],
  ]
  domain_pair_list.forEach(pair => {
    replace_dicts['https://' + pair[1]] = 'https://' + pair[0]
    req_dicts[pair[0]] = pair[1]
  })
}

// 设置返回的cookies
function modifyCookies(headers) {
  headers.forEach((value, key) => {
    if (key == 'set-cookie') {
      let new_value = value.replaceAll('domain=.github.com', `domain=.${your_domain}`)
      new_value = new_value.replaceAll('domain=github.com', `domain=${your_domain}`)
      headers.set(key, new_value)
      //console.log(key, new_value)
    }
  });
}

init(your_domain)
addEventListener("fetch", event => {
  event.respondWith(fetchAndStream(event.request))
})

async function fetchAndStream(request) {

  // init(your_domain)
  // 访问目标网站
  const url = new URL(request.url);
  // 如果path是 /login
  if(url.pathname == '/login'){
    return fetch(login_page)
  }
  const hostname = url.hostname;
  const modifiedRequest = modifyRequest(request)
  let response = await fetch(modifiedRequest)
  var new_response
  // 分情况返回
  const content_type = response.headers.get('content-type').toLowerCase();
  if (content_type != null && content_type.includes('text/html') && content_type.includes('utf-8')) {
    //console.log('返回内容进行相应替换')
    // 如果是text/html，那么将域名文本进行替换
    let origin_text = await response.text()
    const new_text = replaceText(origin_text)
    new_response = new Response(new_text, response)
  } else {
    // 如果不是，直接返回
    //console.log('返回内容未作修改')
    new_response = new Response(response.body, response)
  }
  // 对headers进行修饰
  new_response.headers.set('access-control-allow-origin', '*');
  new_response.headers.set('access-control-allow-credentials', true);
  new_response.headers.delete('content-security-policy');
  new_response.headers.delete('content-security-policy-report-only');
  new_response.headers.delete('clear-site-data');
  // 对301/302 重定向进行修饰, 并防止死循环
  if (new_response.headers.has('location')) {
    let location = new_response.headers.get('location')
    const url_location = new URL(location);
    console.log(hostname, url_location.hostname)
    if (hostname != url_location.hostname) {
      location = replaceText(location)
      new_response.headers.set('location', location)
    }
  }
  // 对p-jax进行替换
  if (new_response.headers.has("x-pjax-url")) {
    let location = new_response.headers.get("x-pjax-url")
    location = replaceText(location)
    new_response.headers.set("x-pjax-url", location)
  }

  modifyCookies(new_response.headers)
  return new_response
}

function replaceText(origin_text) {
  for (old in replace_dicts) {
    let re = new RegExp(old, 'g')
    origin_text = origin_text.replace(re, replace_dicts[old]);
    //console.log(`将${old}替换为${replace_dicts[old]}` )
  }
  return origin_text
}
function modifyRequest(request) {
  // 获取当前信息
  const url = new URL(request.url);
  const hostname = url.hostname;
  // 修改url
  const new_url = new URL(request.url);
  new_url.hostname = req_dicts[hostname]
  // 修改headers Host\Referer\Origin
  const new_request_headers = new Headers(request.headers)
  new_request_headers.set('Host', new_url.hostname);
  if (request.headers.has('referer')) {
    const referer = request.headers.get('referer');
    const refererNew = referer.replaceAll(hostname, new_url.hostname);
    new_request_headers.set('referer', refererNew);
  }
  if (request.headers.has('origin')) {
    const origin = request.headers.get('origin');
    const originNew = origin.replaceAll(hostname, new_url.hostname);
    new_request_headers.set('origin', originNew);
  }
  //console.log(`${new_url.href}\n\n`)
  // new_request_headers.forEach( (value, key) => {
  //   console.log(`${key} => ${value}`)
  // })
  const modifiedRequest = new Request(new_url.href, {
    body: request.body,
    headers: new_request_headers,
    method: request.method,
    redirect: request.redirect
  })
  return modifiedRequest
}