#!/usr/bin/env bash

## on Linux
# crontab -e
# 0 21 * * * /path/to/MyWiki/daily-update.sh

## on Windows
# schtasks /create /tn "WikiDailyUpdate" /tr "\path\to\MyWiki\daily-update.sh" /sc daily /st 23:00

set -e

cd "$(dirname "$0")"

git add tiddlers
git commit -m "Update on $(date --utc -I) from $(hostname)"
git push
