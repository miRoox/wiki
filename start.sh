#!/bin/env bash

set -e

if [ -z "$WIKIPW" ]; then
  echo "Error: WIKIPW environment variable is not set."
  exit 1
fi

tiddlywiki --listen host="${HOST:-127.0.0.1}" port=7777 username=miRoox password="$WIKIPW" 'readers=(anon)' 'writers=(authenticated)' admin=miRoox
