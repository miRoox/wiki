#!/usr/bin/env bash

## on Linux
# crontab -e
# 0 21 * * * /path/to/MyWiki/scripts/daily-update.sh

## on Windows
# schtasks /create /tn "WikiDailyUpdate" /tr "\path\to\MyWiki\scripts\daily-update.sh" /sc daily /st 23:00

set -e

cd "$(git rev-parse --show-toplevel)"
FOLDER=tiddlers

git pull --ff-only
git add "$FOLDER"
if git diff --exit-code --staged "$FOLDER"; then
    echo "No updates today"
else
    if [ ! -d .venv ]; then
        echo "Creating virtual environment..."
        uv sync
    fi
    # shellcheck source=../.venv/bin/activate
    source .venv/bin/activate
    python scripts/git-commit.py
    git push
fi
