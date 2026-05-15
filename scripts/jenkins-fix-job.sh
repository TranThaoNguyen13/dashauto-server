#!/usr/bin/env bash
# Sua job dashauto-server neu pipeline trong hoac chua cau hinh SCM
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="${JENKINS_CONTAINER:-dashauto-jenkins}"
JOB_NAME="dashauto-server"
GIT_URL="${JENKINS_GIT_URL:-https://github.com/TranThaoNguyen13/dashauto-server.git}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container $CONTAINER chua chay. Chay: docker compose up -d jenkins"
  exit 1
fi

echo "==> Ghi lai config job $JOB_NAME (Git: $GIT_URL)"
sed "s|https://github.com/TranThaoNguyen13/dashauto-server.git|$GIT_URL|g" \
  "$ROOT/jenkins/job-config.xml" \
  | docker exec -i "$CONTAINER" tee "/var/jenkins_home/jobs/$JOB_NAME/config.xml" >/dev/null

echo "==> Reload Jenkins"
docker exec "$CONTAINER" java -jar /var/jenkins_home/war/WEB-INF/jenkins-cli.jar -s http://localhost:8080/ reload-configuration 2>/dev/null \
  || curl -sf -X POST "http://127.0.0.1:8080/reload-configurationAsCode" 2>/dev/null \
  || docker restart "$CONTAINER"

echo "==> Xong. Mo http://localhost:8080/job/$JOB_NAME/ -> Build Now"
