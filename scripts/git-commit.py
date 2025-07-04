#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from datetime import datetime, timezone
import subprocess
import os
import socket
import sys
from openai import OpenAI

# 设置 OpenAI API 密钥
OPENAI_API_KEY = os.getenv("DEEPSEEK_API_KEY")  # 请确保环境变量中已设置 DEEPSEEK_API_KEY
if not OPENAI_API_KEY:
    raise ValueError("请设置环境变量 DEEPSEEK_API_KEY")

# 初始化 OpenAI 客户端
client = OpenAI(api_key=OPENAI_API_KEY, base_url="https://api.deepseek.com/v1")

def get_git_diff():
    """获取当前 git 暂存区的 diff 输出"""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--unified=1"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"获取 git diff 失败: {e}", file=sys.stderr)
        return None

def limit_diff_output(diff_output: str, max_chars=1000):
    """Limits the diff output for each file to a maximum number of characters."""
    
    file_diffs = diff_output.split("diff --git")
    
    limited_diffs = []
    for file_diff in file_diffs[1:]:  # Skip the first empty string
        lines = file_diff.splitlines()
        
        if not lines:
            continue
        
        limited_output = lines[0] + "\n"  # Add the diff --git line
        char_count = 0
        
        for line in lines[1:]:
            if char_count + len(line) + 1 <= max_chars:
                limited_output += line + "\n"
                char_count += len(line) + 1
            else:
                limited_output += "...<<truncated>>...\n"
                break
        
        limited_diffs.append(limited_output)
        
    return "\ndiff --git".join(limited_diffs)

def git_commit(message: str):
    """执行 git commit 命令"""
    try:
        subprocess.run(
            ["git", "commit", "-m", message],
            check=True
        )
        print("提交成功！")
    except subprocess.CalledProcessError as e:
        print(f"Git 提交失败: {e}", file=sys.stderr)

def generate_commit_message(diff_content: str):
    """使用 OpenAI API 根据 diff 生成 commit message"""
    if not diff_content:
        return None

    # 构造提示词
    prompt = f"""
你是一个专业的代码提交信息生成助手。这个仓库是一个基于Tiddlywiki的个人知识管理库，旨在帮助用户高效地记录和管理个人知识。
以下是 git diff 的输出内容，请分析并生成一个简洁、清晰的 commit message (每行不超过 50 个字符），描述文档或代码更改的主要目的或功能：

{diff_content}

生成的 commit message 应简明扼要，符合 git 提交信息的最佳实践（如使用动词开头，描述更改内容，多项更改以 Markdown 列表形式列出）。
注意：使用中文生成 commit message。不要包含任何其他文本或解释，只返回 commit message 本身。
"""

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",  # 使用适合的模型
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.5
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"调用 OpenAI API 失败: {e}", file=sys.stderr)
        return None

def main():
    # 获取 git diff
    diff_content = get_git_diff()
    if not diff_content:
        print("没有检测到 git 暂存区更改", file=sys.stderr)
        return
    diff_content = limit_diff_output(diff_content)

    commit_header = f"Update on {datetime.now(timezone.utc).date()} from {socket.gethostname()}"
    # 生成 commit message
    commit_message = generate_commit_message(diff_content)
    if commit_message:
        full_commit_message = f"{commit_header}\n\n{commit_message.strip()}"
    else:
        full_commit_message = commit_header

    print("commit message:")
    print(full_commit_message)
    git_commit(full_commit_message)

if __name__ == "__main__":
    main()
