`qa_reproduce.py` → Jenkins test pipeline → `run_remote_test.sh` → `real_remote_test.sh` → `run_test.sh`

### `qa_reproduce.py <testsuites>` 触发 [Jenkins](#Jenkins) pipeline

参见：[搭建自动化测试环境](http://confluence.zstack.io/pages/viewpage.action?pageId=77611727)

```py
TestSuiteJob(
    'zstack_cube_2.2.10', # ci_target：环境类型，对应result.ztack.io/build的buildtype
    'nightly', # test_type：固定参数，无实际意义(影响run_remote_test里的测试轮数)
    'cube_2.2.10', # test_target：有些名字有特殊作用，如cube
    'cube', # testsuite：搭建环境的配置文件所在的目录
    'test-config-one-nic.xml', # testconfig：搭建环境用的配置文件
    2, # parallel_level：setup两次，固定参数
    reproduce_case='cube/suite_setup.py', # 所运行的用例路径
    buildid='105', # 搭建环境的build版本号
    woodpecker='latest', # woodpecker 版本
    user='yongan.lu', # 用户名
    scenarioconfig='scenario-config-one-nic.xml', #  scenario 配置
)
```

`qa_reproduce.py` 解析脚本里的 `TestSuiteJob` 列表并据此通过 API 触发 Jenkins [test pipeline](http://reproduce.jenkins.zstack.io/job/test/)。在该 pipeline 中，获取并锁定 `IP_RANGE_NAME`，然后调用 `run_remote_test.sh`。

### 从 `run_remote_test.sh` 到 `real_remote_test.sh`

`jenkins_k8s/test_script/run_remote_test.sh` 是一层包装，主要进行

1. LABEL CHECK（用途不明，Shell Check 显示只有生成 `SUITE_NAME` 时用到了一部分结果）
2. 确定 `ROUND_NUM`（循环次数）
3. 生成 `SUITE_NAME`，用于修改对应Jenkins job (build) 的显示名称（display name）
4. 执行 `ROUND_NUM` 次 `real_remote_test.sh`

`jenkins_k8s/test_script/real_remote_test.sh` 前面的部分和 `run_remote_test.sh` 类似，之后是

1. 从 `IP_RANGE_NAME` 获取 `range_num`
2. 跟据 `range_num` 确定第一层嵌套环境 IP 等资源
3. 根据 `TESTSUITE` 确定计算规格 UUID
4. 根据 `CI_TARGET` 和 `CEPH_VERSION` 确定 Ceph 脚本及镜像 UUID
5. 删除该 IP range 对应的 VM、云盘、网络等资源（如存在）
6. 生成 `VM_NAME`
7. 跟据 `range_num` 确定 `IMAGE_SERVER`（未使用）
8. 确定 MN、host 乃至路由器镜像的名称
9. 根据 `TEST_TARGET` 分类查询 VM、host的 UUID、IP等信息
10. 创建 woodpecker 节点，配置并检查网络环境
11. 根据 `TESTSUITE` 和 `TESTCONFIG` 进行网络、系统等配置
12. 配置 SSH，如免密登录
13. 向 profiling 请求 nightlyprofiling 接口更新状态
14. 调用 `jenkins_script/prepare_report.py` 脚本向 result.zstack.io 数据库 `app_testreport` 表插入数据
15. 复制部分脚本及 jar 包到 woodpecker 节点
16. 在 woodpecker 节点部署 woodpecker 
17. 通过 `run_test.sh` 启动 woodpecker 执行测试并检查是否成功

参见：[自动化执行流程总体介绍](http://confluence.zstack.io/pages/viewpage.action?pageId=129856146)

### 14400出现的情况和解决方法

可能被 Jenkins log 显示出来的代码中，包含 `sleep 14400` 的片段有两处，都在 `jenkins_k8s/test_script/real_remote_test.sh` 内：

第一处位于 trap handler，当脚本出错或退出时，而 woodpecker 尚未部署

```sh
ERRTRAP()
{
    # ...
    if [ "${SETUP_EXECUTED}" == "" -o "${SETUP_FAIL}" == "" ]; then
        set_job_name "${JENKINS_HOME}" "${JENKINS_SERVER}" "test" "${BUILD_NUMBER}" "${BUILD_USER}_setup_${CI_TARGET}_${NORMALIZE_SUITE_NAME}_${OVERALL_BUILD_NUMBER}"
        if [ "${LABEL}" == "singleanalysis" ]; then
            curl --retry 10 -i -H "Content-Type: application/json" -X POST -d "{\"status\":\"ready\", \"unexpected_case_schedule_id\":\"${PULL_TEST}\"}" http://result.autoanalysis.zstack.io/result/api/v1.0/unexpectedcase/schedule || echo ingore
        fi
        if [ "${PULL_TEST}" != "no" -a "${PULL_TEST}" != "null" -a "${PULL_TEST}" != "" ]; then
            curl --retry 3 -i -H "Content-Type: application/json" -X POST -d "{\"testjob_schedule_id\":\"${PULL_TEST}\", \"status\":\"trap\", \"job_id\":\"${JENKINS_BUILD_ID}\"}" http://result.zstack.io/result/api/v1.0/testjob/schedule || echo ignore
            zstack_logout ${ZSTACK_SERVER_IP} ${SESSION_UUID} || echo ignore
            exit 1
        fi
        sleep 14400
    fi
    # ...
}

trap 'ERRTRAP $LINENO' ERR
trap 'ERRTRAP $LINENO' EXIT
```

第二处位于脚本的最后部分，当检查 woodpecker 部署时，没有完成并存在错误

```sh
if [ "${SETUP_EXECUTED}" == "no" -o "${SETUP_FAIL}" == "yes" ]; then
    set_job_name "${JENKINS_HOME}" "${JENKINS_SERVER}" "test" "${BUILD_NUMBER}" "${BUILD_USER}_setup_${CI_TARGET}_${NORMALIZE_SUITE_NAME}_${OVERALL_BUILD_NUMBER}"
    if [ "${PULL_TEST}" != "no" -a "${PULL_TEST}" != "null" -a "${PULL_TEST}" != "" ]; then
        exit 1
    fi

    curl -f -i -H 'Content-Type: application/json' -X POST -d '{"uuid1":"'${PROFILING_UUID}'", "phase1":"nightly", "phase2":"8debug_setup", "buildid":"'${OVERALL_BUILD_NUMBER}'", "testconfig":"'${TESTCONFIG}'", "testscen":"'${SCENARIO_CONFIG}'", "buildtype":"'${CI_TARGET}'", "testos":"'${TESTOS}'", "testtarget":"'${TEST_TARGET}'", "testsuite":"'${TESTSUITE}'","testcase":"testcase", "testresult":"testresult", "runid":"'${PULL_TEST}'", "roundid":"'${JENKINS_BUILD_ID}'"}' http://profiling.zstack.io/api/v1.0/nightlyprofiling || echo ignore debug
    sleep 14400
fi
```

因此，出现 14400 通常可能是

1. 更新的脚本出现了逻辑错误甚至语法错误，比如某人的测试 workaround 与其它用途不兼容，且没有及时 revert 掉。这类问题应该根据 log 定位错误的原因，及时处理。
2. 参数无效，例如 `ci_target`+`buildid` 不是有效的build结果组合，导致无法找到对应的资源。这类问题需要根据实际情况检查并使用正确有效的参数。
3. Host 资源不足导致创建资源失败，一般是测试扎堆或者一些无用的资源没有及时清理。这类问题可以尝试清理一些无用资源，但更一般的情况可能要等待测试高峰过去再重新进行测试。

例如：<http://reproduce.jenkins.zstack.io/job/test/3061/console> 沿着日志从后往前看，可以看到 `sleep 14400` 的前面有 `ERRTRAP 1`，即 trap handler 导致的 14400。再往前看可以看到许多应当是 IP 的地方显示的是 null，进一步溯源可以看到 curl API 的结果中包含描述为“required local primary storage[uuid:f17c4f1461734f83a9ca192671427471] cannot satisfy conditions[state: Enabled, status: Connected], or hosts providing the primary storage don\u0027t satisfy conditions[state: Enabled, status: Connected, size \u003e 16034824192 bytes]”的错误，即资源不足。
