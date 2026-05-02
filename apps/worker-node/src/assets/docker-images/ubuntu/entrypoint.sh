#!/bin/sh
set -e

if [ -n "$AUTHORIZED_KEYS" ]; then
  mkdir -p /home/user/.ssh
  printf '%s\n' "$AUTHORIZED_KEYS" > /home/user/.ssh/authorized_keys
  chown -R user:user /home/user/.ssh
  chmod 700 /home/user/.ssh
  chmod 600 /home/user/.ssh/authorized_keys
fi

mkdir -p /run/sshd /var/run/sshd
exec /usr/sbin/sshd -D -e
