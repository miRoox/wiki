[搭建双管理节点HA环境](http://confluence.zstack.io/pages/viewpage.action?pageId=129855064)

* node1: `172.20.10.147`（主管理节点）
* node2: `172.20.10.205`
* vip：`172.20.89.141`（找网管预先分配的IP）

注意2个管理节点的版本必须一致！如果node1是老版本，建议先升级跟node2同一版本再行安装

### 配置[网桥](#网桥)

node1:

```sh
/usr/local/bin/zs-network-setting -b eth0 172.20.10.147 255.255.0.0 172.20.0.1
```

node2

```sh
/usr/local/bin/zs-network-setting -b eth0 172.20.10.205 255.255.0.0 172.20.0.1
```

### 配置免密

使用工具配置免密，以下两个节点都要：

部署 `zstack_tools.tar.gz`

```sh
wget http://minio.zstack.io:9001/download/nightly/mc -O mc && chmod +x mc && mv mc /usr/bin/
wget http://minio.zstack.io:9001/download/nightly/gg -O gg && chmod +x gg && mv gg /usr/bin/

mc alias set minio http://minio.zstack.io:9001 admin admin123456
mc cp --recursive minio/download/yu.guo/zstack_tools.tar.gz /root

tar -zxvf zstack_tools.tar.gz
cd zstack_tools/

nano ansible/hosts
```

ansible/hosts（注意时间同步服务器填主节点的ip）:
```conf
[nodes]
172.20.10.147
172.20.10.205

[chrony]
172.20.10.147

[nodes:vars]
ansible_user=root
ansible_ssh_pass=password
```

```sh
./prepare.sh -i ansible/hosts
```

然后`cat /etc/hosts`查看主机名有没有被修改，再使用`ssh root@zstack-1`和`ssh root@zstack-2`看看是否互信成功

### 下载zsha和hamon工具

在主节点执行：

```sh
wget http://storage.zstack.io/mirror/zsha2_4.6.32/latest/zsha2 -O zsha2 && chmod 777 zsha2
wget http://storage.zstack.io/mirror/zsha2_4.6.32/latest/zstack-hamon -O zstack-hamon && chmod 777 zstack-hamon
```

### 执行安装命令

在主节点执行：

```sh
./zsha2 install-ha -nic br_eth0 -gateway 172.20.0.1 -slave "root:password@172.20.10.205" -vip 172.20.89.141  -time-server 172.20.10.147 -db-root-pw zstack.mysql.password -yes
```

安装完成之后使用`zsha2 status`命令查看状态， UI使用vip登录即可。

若双管理节点mn和ui status都是Running，那么搭建完成。
