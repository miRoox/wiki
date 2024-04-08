检查iso版本

```sh
cat /opt/zstack-dvd/x86_64/c76/VERSION
```

1. 更新iso
   1. 下载最新的iso，如 <http://storage.zstack.io/mirror/zstack_cloud_iso_c76_4.6.31/latest/>
   2. 挂载镜像 
      1. `mkdir /media/iso`
      2. `mount xxx.iso /media/iso -o loop`
   3. 进入挂载路径，找到`scripts/zstack-upgrade`，执行 `zstack-upgrade -r xxx.iso`
2. 更新bin
   1. 下载最新的bin，如 <http://result.zstack.io/build/?buildtype=zstack_4.6.31>
   2. 运行 `xxx.bin -u` 更新
   3. trouble shot
      - "The current local repo is not suitable for ZStack-Cloud installation.": 先更新iso
      - "failed to upgrade database": <http://confluence.zstack.io/pages/viewpage.action?pageId=88670867>
3. 更新后启动
   1. 启动 `zstack-cloud-ctl start`
   2. 启动前端 `zstack-cloud-ctl start_ui`
