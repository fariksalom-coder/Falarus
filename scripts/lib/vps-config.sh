#!/usr/bin/env bash
# Production SSH manzili uchun yagona standart qiymat.
VPS_HOST="${VPS_HOST:-82.115.50.100}"
VPS_USER="${VPS_USER:-ubuntu}"
if [[ "$VPS_HOST" == *@* ]]; then
  VPS_SSH="${VPS_SSH:-$VPS_HOST}"
else
  VPS_SSH="${VPS_SSH:-$VPS_USER@$VPS_HOST}"
fi
APP_DIR="${APP_DIR:-/home/ubuntu/Falarus}"
