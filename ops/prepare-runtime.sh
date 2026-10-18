#!/bin/sh
# Run on the VPS as the deployment operator. Does not activate the release.
set -eu
stage=/tmp/lf-mcp-upgrade-20261018
runtime=/opt/lf-node-v22.23.3
mkdir -p "$stage"
if [ ! -x "$runtime/bin/node" ]; then
    curl --fail --silent --show-error --location --proto '=https' --max-time 120 https://nodejs.org/dist/v22.23.3/node-v22.23.3-linux-x64.tar.xz -o "$stage/node-v22.23.3-linux-x64.tar.xz"
    curl --fail --silent --show-error --location --proto '=https' --max-time 30 https://nodejs.org/dist/v22.23.3/SHASUMS256.txt -o "$stage/SHASUMS256.txt"
    cd "$stage"
    awk '$2 == "node-v22.23.3-linux-x64.tar.xz" {print}' SHASUMS256.txt > node.sha256
    test -s node.sha256
    sha256sum --check node.sha256
    mkdir "$runtime"
    tar -xJf node-v22.23.3-linux-x64.tar.xz -C "$runtime" --strip-components=1
    chown -R root:root "$runtime"
fi
test "$("$runtime/bin/node" --version)" = 'v22.23.3'
printf 'Verified MCP-scoped Node runtime: '
"$runtime/bin/node" --version
getent passwd lf-mcp-publisher >/dev/null || useradd --system --home-dir /var/lib/lf-spainlegal-content --shell /usr/sbin/nologin lf-mcp-publisher
install -d -o lf-mcp-publisher -g lf-mcp-publisher -m 0755 /var/lib/lf-spainlegal-content
