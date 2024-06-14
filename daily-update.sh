#!/usr/bin/env bash

## on Linux
# crontab -e
# 0 21 * * * /path/to/MyWiki/daily-update.sh

## on Windows
# schtasks /create /tn "WikiDailyUpdate" /tr "\path\to\MyWiki\daily-update.sh" /sc daily /st 23:00

set -e

cd "$(dirname "$0")"
FOLDER=tiddlers

git pull --ff-only
if git diff --exit-code "$FOLDER"; then
    echo "No updates today"
else
    git add "$FOLDER"
    git commit -m "Update on $(date --utc -I) from $(hostname)"
    git push
fi
