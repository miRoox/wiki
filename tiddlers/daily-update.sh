#!/usr/bin/env bash

## on Linux
# crontab -e
# 0 21 * * * /path/to/MyWiki/tiddlers/daily-update.sh

## on Windows
# schtasks /create /tn "WikiDailyUpdate" /tr "\path\to\MyWiki\tiddlers\daily-update.sh" /sc daily /st 23:00

set -e

cd "$(git rev-parse --show-toplevel)"
FOLDER=tiddlers

git pull --ff-only
if git diff --exit-code "$FOLDER"; then
    echo "No updates today"
else
    git add "$FOLDER"
    git commit --no-gpg-sign -m "Update on $(date --utc -I) from $(hostname)"
    git push
fi
