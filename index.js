
const your_domain = this['HOME_DOMAIN'] || '<你的自定义域名>'
const login_page = 'https://nICEnnnnnnnLee.github.io/GithubSoEasy/login.html'
// 301_page_index: 未登录时将首页301到 github
// check_cookie: 需要先访问url ${valid_cookie_set_path} 进行授权
// raw: 不做处理
const anti_spam_mode = '301_page_index'
const valid_cookie_set_path = '/loginyyy?ko=1' // anti_spam_mode = check_cookie 时生效
const valid_user_agent_prefix = 'git/' // anti_spam_mode = check_cookie 时生效，当userAgent以该值开头时跳过
const valid_cookie_key = '_a' // anti_spam_mode = check_cookie 时生效
const valid_cookie_val = 'a'  // anti_spam_mode = check_cookie 时生效
const valid_cookie_str = `${valid_cookie_key}=${valid_cookie_val}`

//返回html时的替换字典
const replace_dicts = {
  'integrity="sha': 'integrity_no="sha' // 去掉完整性校验
}
// 域名指向的路径
const req_dicts = {}
// 根据请求返回结果
let func_response = null

function init(domain) {
  const domain_pair_list = [
    [`git.${domain}`, 'github.com'],
    [`gist.${domain}`, 'gist.github.com'],
    [`gist-notebooks.${domain}`, 'notebooks.githubusercontent.com'],
    [`gist-ucontent.${domain}`, 'gist.githubusercontent.com'],
    [`raw.${domain}`, 'raw.githubusercontent.com'],
    [`assets.${domain}`, 'github.githubassets.com'],
    [`avatars.${domain}`, 'avatars.githubusercontent.com'],
    [`camo.${domain}`, 'camo.githubusercontent.com'],
    [`codeload.${domain}`, 'codeload.github.com'],
    [`releases.${domain}`, 'github-releases.githubusercontent.com'],
    [`object.${domain}`, 'objects.githubusercontent.com'],
  ]
  domain_pair_list.forEach(pair => {
    replace_dicts['//' + pair[1]] = '//' + pair[0]
    req_dicts[pair[0]] = pair[1]
  })
  switch (anti_spam_mode) {
    case 'raw':
      func_response = _raw_func
      break
    case 'check_cookie':
      func_response = _check_cookie_func
      break
    case '301_page_index':
    default:
      func_response = _301_page_index_fuc
      break
  }
}

// 设置返回的cookies
function modifyCookies(headers) {
  headers.forEach((value, key) => {
    if (key == 'set-cookie') {
      let new_value = value.replaceAll('domain=.github.com', `domain=.${your_domain}`)
      new_value = new_value.replaceAll('domain=github.com', `domain=git.${your_domain}`)
      headers.set(key, new_value)
      //console.log(key, new_value)
    }
  });
}

async function _raw_func(request, url) {
  return fetchAndStream(request, url)
}
async function _check_cookie_func(request, url) {
  // 若请求为指定url， 则设置cookie进行授权
  if (url.href.endsWith(valid_cookie_set_path)) {
    const millisecond = new Date().getTime()
    const expiresTime = new Date(millisecond + 31536000000).toUTCString()
    return new Response('授权成功，请重新访问', {
      headers: { "Set-Cookie": `${valid_cookie_key}=${valid_cookie_val}; expires=${expiresTime}; domain=.${your_domain}; path=/; SameSite=None; Secure` },
    });
  }
  // 校验cookie和 User-Agent/Referer头部，不行则返回403
  const cookie = request.headers.get("Cookie") || ""
  if (!cookie.includes(valid_cookie_str)) {
    const ua = request.headers.get("User-Agent") || "";
    const hasNoCorrectUA = !ua.startsWith(valid_user_agent_prefix)
    const hasNoReferer = !request.headers.has("Referer")
    if (hasNoCorrectUA && hasNoReferer) {
      return new Response(`您无权访问\nBrowser UA: ${ua}`, { status: 403 })
    }
  }
  return fetchAndStream(request, url)
}

async function _301_page_index_fuc(request, url) {
  if (url.pathname === '' || url.pathname === '/') {
    const cookie = request.headers.get("Cookie") || "";
    if (!cookie.includes('dotcom_user=')) {
      const destinationURL = `https://${req_dicts[url.hostname]}`;
      return Response.redirect(destinationURL, 301);
    }
  }
  return fetchAndStream(request, url)
}

async function fetchAndStream(request, url) {
  // 如果path是 /robots.txt
  if (url.pathname === '/robots.txt') {
    const content = `User-agent: *
Disallow: /`
    return new Response(content, { headers: { "Content-Type": 'text/plain' }, status: 200 })
  }
  // 如果path是 /login
  if (url.pathname === '/login') {
    return fetch(login_page)
  }
  const hostname = url.hostname;
  const modifiedRequest = modifyRequest(request)
  let response = await fetch(modifiedRequest)
  var new_response
  // 分情况返回
  const content_type = response.headers.get('content-type')?.toLowerCase();
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
  new_response.headers.set('access-control-allow-credentials', 'true');
  new_response.headers.delete('content-security-policy');
  new_response.headers.delete('content-security-policy-report-only');
  new_response.headers.delete('clear-site-data');
  // 对301/302 重定向进行修饰, 并防止死循环
  if (new_response.headers.has('location')) {
    let location = new_response.headers.get('location')
    const url_location = new URL(location);
    //console.log(hostname, url_location.hostname)
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
  for (const old in replace_dicts) {
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
    new_request_headers.set('Referer', refererNew);
  }
  if (request.headers.has('Alt-Used')) {
    const referer = request.headers.get('Alt-Used');
    const refererNew = referer.replaceAll(hostname, new_url.hostname);
    new_request_headers.set('Alt-Used', refererNew);
  }
  if (request.headers.has('origin')) {
    const origin = request.headers.get('origin');
    const originNew = origin.replaceAll(hostname, new_url.hostname);
    new_request_headers.set('Origin', originNew);
  }
  new_request_headers.delete('x-forwarded-proto')
  //new_request_headers.forEach( (value, key) => {
  //console.log(`${key} => ${value}`)
  //})
  const modifiedRequest = new Request(new_url.href, {
    body: request.body,
    headers: new_request_headers,
    method: request.method,
    redirect: request.redirect
  })
  return modifiedRequest
}

init(your_domain)
addEventListener("fetch", event => {
  const url = new URL(event.request.url)
  event.respondWith(func_response(event.request, url))
})