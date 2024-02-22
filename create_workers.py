#!/usr/bin/env python
# coding:utf-8
import os
import requests,json


YOUR_EMAIL = "你的邮箱"
YOUR_API_KEY = "你的全局API_KEY"
YOUR_ACCOUNT_ID = None # 可不填写，可以自己查询
HOME_DOMAIN = "xxx.com" # 必须填写

# prefixs = ['git', 'raw', 'assets', 'avatars', 'camo', 'codeload', 'releases', 'object', 'gist', 'gist-notebooks', 'gist-ucontent']
# 如果你的域名是 abc.com,  会占用git.abc.com 、 raw.abc.com等多个域名
class CFWorker:
    def __init__(self, email, api_key, account_id=None, **args):
        self.email = email
        self.api_key = api_key
        self.headers = headers = {
            'X-Auth-Email': email, 
            'X-Auth-Key': api_key, 
            "Content-Type": "application/json"
        }
        self.account_id = account_id if account_id else self.get_account_id()
        
    def get_account_id(self):
        url = 'https://api.cloudflare.com/client/v4/accounts?page=1&per_page=20&direction=desc'
        res = requests.get(url, headers=self.headers).json()
        # print(res)
        self.account_id = res["result"][0]["id"]
        print("成功获取account id: ", self.account_id)
        return self.account_id
        
    def get_zone_id(self, domain = ''):
        # 获取Zone id
        url = f"https://api.cloudflare.com/client/v4/zones?&account.id={self.account_id}&page=1&per_page=20&order=status&direction=desc&match=all"
        if domain:
            url += f'&name={domain}'
        res = requests.get(url, headers=self.headers).json()
        # print(url)
        return res["result"][0]["id"]

    def delete_worker(self, woker_name):
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/workers/scripts/{woker_name}"
        res = requests.delete(url, headers=self.headers).json()
        # print(res)
        return res["success"]

    def upload_worker(self, script_text, woker_name):
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/workers/scripts/{woker_name}"
        js_headers = dict(self.headers)
        js_headers["Content-Type"] = "application/javascript"
        data = script_text.encode('utf-8')
        res = requests.put(url, headers=js_headers, data=data).json()
        print(res)
        return res["success"]

    def upload_worker_with_env(self, script_text, woker_name, env_list):
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/workers/scripts/{woker_name}"
        boundary = "---------------------------227400808633293654233644280745"
        bindings = [{"name": key, "text": value,"type":"plain_text"} for key,value in env_list]
        bindings = json.dumps(bindings)
        form_headers = dict(self.headers)
        form_headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        data = f'--{boundary}\n'+\
            'Content-Disposition: form-data; name="metadata"; filename="blob"\n'+\
            'Content-Type: application/json\n\n' + \
            '{"body_part":"script","bindings":%s}\n'%bindings + \
            f'--{boundary}\n' + \
            'Content-Disposition: form-data; name="script"; filename="blob"\n' + \
            'Content-Type: application/javascript\n\n' + \
            script_text + \
            f'\n--{boundary}--\n\n'
        res = requests.put(url, headers=form_headers, data=data.encode('utf-8')).json()
        # print(res)
        return res["success"]

    def enable_worker(self, woker_name, enable=True):
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/workers/scripts/{woker_name}/subdomain"
        data = {'enabled': enable}
        data = json.dumps(data)
        res = requests.post(url, headers=self.headers,data=data).json()
        # print(res)
        return res["success"]

    def create_subdomain(self, subdomain):
        """
        创建 <subdomain>.workers.dev
        """
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/workers/subdomain"
        data = {'subdomain': subdomain}
        data = json.dumps(data)
        res = requests.put(url, headers=self.headers,data=data).json()
        return res["result"]["subdomain"]


    def get_subdomain(self):
        """
        获取已经建立的 <subdomain>.workers.dev 中的subdomain
        """
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/workers/subdomain"
        res = requests.get(url, headers=self.headers).json()
        # print(res)
        # 如果是新建的账号，没有开启workers的，随机建立一个
        if res['success'] == False and res['errors'][0]['code'] == 10007:
            import random
            random8 = random.choices("abcdefghijklmnopqrstuvwxyz0123456789",k=8)
            random8 = ''.join(random8)
            return self.create_subdomain(random8)
        else:
            return res["result"]["subdomain"]


    def create_route(self, zone_id, pattern, script_name):
        """
        建立到worker的路由(不再使用，建议用bind_worker_with_domain替代)
        """
        # 新建路由
        url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/workers/routes"
        data = {"pattern": pattern, "script": script_name}
        data = json.dumps(data)
        # print(data)
        res = requests.post(url, headers=self.headers, data=data).json()
        # print(res)
        return res["success"]

    def create_dns_a_record(self, zone_id, name, ip, proxied=True):
        """
        建立DNS ip 解析
        """
        url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
        data = {"type":"A","name":name,"content":ip,"proxied":proxied}
        data = json.dumps(data)
        # print(data)
        # res = requests.post(url, headers=self.headers, data=data).text
        # print(res)
        res = requests.post(url, headers=self.headers, data=data).json()
        return res["success"]

    def delete_dns_a_record(self, zone_id, name):
        """
        删除DNS解析
        """
        url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?name={name}&type=A"
        res = requests.get(url, headers=self.headers).json()["result"]
        if len(res) != 1:
            print(f"未找到 {name} 的DNS记录")
            return None
        dns_id = res[0]["id"]
        url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{dns_id}"
        res = requests.delete(url, headers=self.headers).json()
        print(res)
        return res["success"]

    def bind_worker_with_domain(self, zone_id, domain, worker_name):
        """
        将domain域名绑定到worker上, 相当于 建立域名匹配的路由 + 添加代理域名DNS记录
        """
        # url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/workers/domains/changeset"
        # data = [{"hostname":domain,"service":worker_name,"environment":"production","zone_id":zone_id}]
        # data = json.dumps(data)
        # res = requests.post(url, headers=self.headers, data=data).json()
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/workers/domains/records"
        data = {"hostname":domain,"service":worker_name,"environment":"production","zone_id":zone_id}
        data = json.dumps(data)
        res = requests.put(url, headers=self.headers, data=data).json()
        print(url)
        print(data)
        print(res)
        return res["success"]

def method():
    """
    创建worker并使之生效
        git.<xxx>.workers.dev
    将域名映射到路由上:
        git raw assets avatars codeload releases object gist gist-notebooks gist-ucontent
            .<你的域名> 映射到路由上
    """
    cf_worker = CFWorker(email=YOUR_EMAIL, api_key=YOUR_API_KEY, account_id=YOUR_ACCOUNT_ID)

    with open("index.js", "r", encoding="utf-8") as f:
        script_raw = f.read()
        script = script_raw.replace('<你的自定义域名>', HOME_DOMAIN)

    worker_name = 'git' # 默认脚本名称为git
    print("正在上传worker脚本: ", worker_name)
    result = cf_worker.upload_worker_with_env(script, worker_name,[('HOME_DOMAIN', HOME_DOMAIN), ('WHITE_IP','')])
    print("上传worker脚本成功: ", result)
    if not result:
        exit(-1)

    print("正在使worker脚本生效: ", worker_name)
    result = cf_worker.enable_worker(worker_name,True)
    print("使worker脚本生效成功: ", result)
    if not result:
        exit(-1)

    # 建立路由
    zone_id = cf_worker.get_zone_id(domain=HOME_DOMAIN)
    prefixs = ['git', 'raw', 'assets', 'avatars', 'camo', 'codeload', 'releases', 'object', 'gist', 'gist-notebooks', 'gist-ucontent']
    for prefix in prefixs:
        domain = f'{prefix}.{HOME_DOMAIN}'
        print("绑定域名: ", domain)
        result = cf_worker.bind_worker_with_domain(zone_id, domain, worker_name)
        print("绑定域名成功: ", result)
        if not result:
            exit(-1)

    print(f'配置成功，请访问：https://git.{HOME_DOMAIN}')


if __name__ == "__main__":

    method()
    
    # cf_worker = CFWorker(email=YOUR_EMAIL, api_key=YOUR_API_KEY, account_id=YOUR_ACCOUNT_ID)
    # subdomain = cf_worker.get_subdomain()
    

    
