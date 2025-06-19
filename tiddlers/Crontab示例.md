* 每分钟执行一次命令：
	```cron
	* * * * * command
	```
* 每天凌晨 3 点执行一次命令：
	```cron
	0 3 * * * command
	```
* 每月 1 号和 15 号的下午 4 点：
  ```cron
  0 16 1,15 * * command
	```
* 每隔 5 分钟执行一次命令：
  ```cron
  */5 * * * * command
  ```
* 每次启动时执行：
  ```cron
  @reboot command
	```
