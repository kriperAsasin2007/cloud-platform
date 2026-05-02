FROM alpine:3.20

RUN apk add --no-cache openssh sudo bash curl wget vim git \
    && adduser -D -s /bin/bash user \
    && echo "user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && ssh-keygen -A \
    && printf 'PubkeyAuthentication yes\nPasswordAuthentication no\nPermitRootLogin no\n' \
       >> /etc/ssh/sshd_config

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22
ENTRYPOINT ["/entrypoint.sh"]
