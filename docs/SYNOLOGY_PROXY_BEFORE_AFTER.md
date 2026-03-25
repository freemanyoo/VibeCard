# Synology Docker 프록시 트러블슈팅 Before / After 코드

이 문서는 포트폴리오와 트러블슈팅 정리에 사용할 수 있도록, Synology Docker 환경에서 프론트 Nginx와 백엔드 연결 구조를 어떻게 바꿨는지 before / after 기준으로 정리한 문서입니다.

## 1. 문제 상황 요약

- 프론트 컨테이너: `vibecard-frontend`
- 백엔드 컨테이너: `vibecard-backend`
- 백엔드 공개 포트: `8086 -> 8080`
- 초기 프록시 대상: `host.docker.internal:8086`
- 증상: 브라우저 `/api` 요청이 `504 Gateway Timeout`

핵심 원인은 프론트 Nginx 컨테이너가 `host.docker.internal:8086` 경로로는 안정적으로 접근하지 못했던 점이었습니다.

## 2. Before 코드

### 2-1. `nginx.conf` (변경 전)

파일 위치 예시:

```text
/volume1/VibeCard/nginx/default.conf
```

문서용 예시 파일:

```text
docs/nginx-before.conf
```

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://host.docker.internal:8086/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://host.docker.internal:8086/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2-2. 네트워크 상태

```text
vibecard-frontend -> bridge
vibecard-backend  -> vibecard_default
```

이 상태에서는 프론트가 `backend:8080` 서비스명으로 직접 접근할 수 없어서, 호스트 포트 `8086`을 우회 경로로 사용하고 있었습니다.

## 3. After 코드

### 3-1. `nginx.conf` (변경 후)

파일 위치 예시:

```text
/volume1/VibeCard/nginx/default.conf
```

문서용 예시 파일:

```text
docs/nginx-after.conf
```

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://backend:8080/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3-2. 네트워크 상태

```text
vibecard-frontend -> bridge + vibecard_default
vibecard-backend  -> vibecard_default
```

이후 프론트 컨테이너가 같은 Docker 네트워크 안에서 `backend:8080` 서비스명으로 직접 접근하도록 바뀌었습니다.

## 4. 실제 반영 명령어

### 4-1. 프론트 컨테이너를 백엔드 네트워크에 연결

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker network connect vibecard_default vibecard-frontend"
```

### 4-2. Nginx 설정 변경 후 프론트 컨테이너 재시작

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker restart vibecard-frontend"
```

### 4-3. 컨테이너 내부 연결 확인

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker exec vibecard-frontend sh -lc 'getent hosts backend && curl -I --max-time 5 http://backend:8080'"
```

## 5. 결과

### 변경 전

- `/api` 요청이 `504 Gateway Timeout`
- 프론트에서 로그인, 회원가입, 이메일 인증, 업로드 요청이 전부 실패

### 변경 후

- `/api` 요청이 실제 백엔드 응답 코드(`200`, `400`, `401` 등)로 반환
- 프론트와 백엔드가 Synology 운영 환경에서 안정적으로 통신
- Google 로그인, 일반 로그인, API 호출 흐름 정상화

## 6. 포트폴리오용 코드 캡처 추천

### 추천 1. `nginx.conf` 변경 전

```nginx
location /api/ {
    proxy_pass http://host.docker.internal:8086/api/;
}
```

### 추천 2. `nginx.conf` 변경 후

```nginx
location /api/ {
    proxy_pass http://backend:8080/api/;
}
```

- 보조 캡처: `docker inspect` 또는 `docker exec vibecard-frontend ... getent hosts backend`
