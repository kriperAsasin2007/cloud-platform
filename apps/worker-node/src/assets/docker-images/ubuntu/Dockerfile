FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server sudo curl wget vim nano git \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -s /bin/bash user \
    && usermod -aG sudo user \
    && echo "user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && mkdir -p /var/run/sshd /etc/ssh/sshd_config.d \
    && ssh-keygen -A \
    && printf 'PubkeyAuthentication yes\nPasswordAuthentication no\nPermitRootLogin no\n' \
       > /etc/ssh/sshd_config.d/cloud-platform.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22
ENTRYPOINT ["/entrypoint.sh"]
