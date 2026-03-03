# 배포 업데이트 명령어

이 문서는 현재 시놀로지 배포 구조 기준으로, 프론트/백엔드를 다시 빌드하고 반영할 때 쓰는 최소 명령어만 정리합니다.

기준 경로:

- 로컬 프로젝트: `/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB`
- 시놀로지 배포 경로: `/volume1/VibeCard`
- 시놀로지 SSH: `ssh -p 2222 freemanyoo@192.168.50.94`

## 1. 프론트 업데이트

프론트는 로컬에서 빌드 후 `dist`만 시놀로지로 덮어씁니다.

### 1-1. 로컬 빌드

```bash
cd "/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/frontend"
npm run build
```

### 1-2. 시놀로지로 업로드

macOS `scp` 대신 `tar | ssh` 방식이 안정적입니다.

```bash
cd "/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/frontend/dist"
tar --no-xattrs -cf - . | ssh -p 2222 freemanyoo@192.168.50.94 "mkdir -p /volume1/VibeCard/frontend-dist && cd /volume1/VibeCard/frontend-dist && tar -xf -"
```

### 1-3. macOS 메타파일 정리

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "find /volume1/VibeCard/frontend-dist -name '._*' -delete"
```

### 1-4. 접속

```text
https://vibecard.nextfreemanyoo.myds.me/
```

브라우저에서 강력 새로고침 후 확인합니다.

## 2. 백엔드 업데이트

백엔드는 로컬에서 JAR를 다시 만들고, 시놀로지의 `app.jar`를 교체한 뒤 컨테이너를 재생성합니다.

### 2-1. 로컬 JAR 빌드

```bash
cd "/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/backend"
./gradlew bootJar
```

### 2-2. 시놀로지로 JAR 업로드

현재 빌드 결과물 이름은 `backend/build/libs/backend-0.1.0.jar` 기준입니다.

```bash
scp -P 2222 "/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/backend/build/libs/backend-0.1.0.jar" freemanyoo@192.168.50.94:/volume1/VibeCard/backend/app.jar
```

### 2-3. 백엔드 컨테이너 재생성

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "cd /volume1/VibeCard && /usr/local/bin/docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate backend"
```

### 2-4. 백엔드 로그 확인

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker logs --tail 100 vibecard-backend"
```

## 3. 전체 반영 빠른 순서

프론트와 백엔드를 둘 다 반영할 때는 보통 아래 순서로 진행합니다.

```bash
# 1) backend build
cd "/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/backend"
./gradlew bootJar

# 2) backend upload
scp -P 2222 "/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/backend/build/libs/backend-0.1.0.jar" freemanyoo@192.168.50.94:/volume1/VibeCard/backend/app.jar

# 3) backend restart
ssh -p 2222 freemanyoo@192.168.50.94 "cd /volume1/VibeCard && /usr/local/bin/docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate backend"

# 4) frontend build
cd "/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/frontend"
npm run build

# 5) frontend upload
cd "/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/frontend/dist"
tar --no-xattrs -cf - . | ssh -p 2222 freemanyoo@192.168.50.94 "mkdir -p /volume1/VibeCard/frontend-dist && cd /volume1/VibeCard/frontend-dist && tar -xf -"

# 6) frontend metadata cleanup
ssh -p 2222 freemanyoo@192.168.50.94 "find /volume1/VibeCard/frontend-dist -name '._*' -delete"
```

## 4. 점검 명령어

### 컨테이너 상태

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

### 백엔드 응답 확인

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "curl -I --max-time 5 http://127.0.0.1:8086"
```

### 프론트 배포 파일 확인

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "ls -la /volume1/VibeCard/frontend-dist && ls -la /volume1/VibeCard/frontend-dist/assets"
```
