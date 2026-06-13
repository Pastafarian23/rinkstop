#!/bin/bash
# Reinstall Android build toolchain after sandbox reset.
# Run as: bash install-android-toolchain.sh
# This is idempotent — safe to re-run.

set -e

# 1. Java 21
if ! command -v java >/dev/null 2>&1; then
  echo "[1/4] Installing Java 21..."
  apt-get update -qq >/dev/null 2>&1
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openjdk-21-jdk-headless >/dev/null 2>&1
else
  echo "[1/4] Java already installed: $(java -version 2>&1 | head -1)"
fi

# 2. Android SDK command-line tools
SDK=/opt/android-sdk
mkdir -p $SDK/cmdline-tools
if [ ! -d "$SDK/cmdline-tools/latest/bin" ]; then
  echo "[2/4] Installing Android command-line tools..."
  cd /tmp
  if [ ! -f cmdline-tools.zip ]; then
    curl -sL -o cmdline-tools.zip \
      https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  fi
  apt-get install -y -qq unzip >/dev/null 2>&1 || true
  unzip -q -o cmdline-tools.zip -d /tmp/clt-extract
  rm -rf $SDK/cmdline-tools/latest
  mv /tmp/clt-extract/cmdline-tools $SDK/cmdline-tools/latest
  rm -rf /tmp/clt-extract
else
  echo "[2/4] Android command-line tools already installed"
fi

# 3. SDK packages
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=$SDK
export ANDROID_SDK_ROOT=$SDK
export PATH=$PATH:$JAVA_HOME/bin:$SDK/cmdline-tools/latest/bin:$SDK/platform-tools

echo "[3/4] Installing SDK platforms 34, build-tools 34.0.0, platform-tools..."
yes | sdkmanager --licenses >/dev/null 2>&1 || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" >/dev/null 2>&1

# 4. Verify
echo "[4/4] Verifying..."
java -version 2>&1 | head -1
$SDK/cmdline-tools/latest/bin/sdkmanager --version
ls $SDK/platforms/ $SDK/build-tools/ 2>&1 | head -5
echo "DONE. To use: source $SDK/../rinkstop-platform/android-env.sh"
