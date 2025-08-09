[[GitHub]]的Fork功能实际上主要是服务于Pull Request，然而我以前并没有正确地认识到这一点，简单地把Fork当clone使，导致有些时候不太方便。

<!--more-->

实际做起来却意外的简单。

首先，把删去所有与本地仓库连接的远程仓库

```shell
$ git remote remove origin
$ git remote remove upstream
```

然后，把GitHub上自己的远程仓库给删了。

最后，在GitHub上重新建立同名仓库，然后把本地仓库关联上去。

```shell
$ git remote add origin <your repo>
```

于是就大功告成了。
